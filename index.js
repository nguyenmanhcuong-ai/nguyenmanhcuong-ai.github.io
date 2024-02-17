import express from 'express';
import multer from 'multer';
import bodyParser from 'body-parser';
import { Sequelize, DataTypes } from 'sequelize';
import pkg from 'pg';

const { Client } = pkg;

const connectionInfo = {
  user: 'postgres.ivtijeamwvrwtaqqstuo',
  host: 'aws-0-ap-southeast-1.pooler.supabase.com',
  database: 'postgres',
  password: 'Cuongai@0910',
  port: 5432,
};

const app = express();
const port = process.env.PORT || 8080;

async function getDataFromPostgreSQL() {
  const client = new Client(connectionInfo);

  try {
    await client.connect();
    console.log('Kết nối đến cơ sở dữ liệu thành công');

    const query = 'SELECT * FROM "Moments";';
    const result = await client.query(query);

    await client.end();

    return result.rows;
  } catch (error) {
    console.error('Lỗi khi lấy dữ liệu từ PostgreSQL:', error);
    throw error;
  }
}

const sequelize = new Sequelize({
  dialect: 'postgres',
  username: 'postgres',
  password: 'Cuongai@0910',
  database: 'postgres',
  host: 'db.ivtijeamwvrwtaqqstuo.supabase.co',
  dialectOptions: {
    port: 5432,
  },
});

const Moment = sequelize.define('Moment', {
  urlpicture: DataTypes.STRING,
  date: DataTypes.STRING,
  location: DataTypes.STRING,
  occasion: DataTypes.STRING,
  description: DataTypes.STRING,
}, {
  timestamps: false,
});

const Comment = sequelize.define('Comment', {
  name: DataTypes.STRING,
  comment: DataTypes.STRING,
  momentId: DataTypes.INTEGER,
}, {
  timestamps: false,
});

Comment.belongsTo(Moment, { foreignKey: 'momentId' });

const Fmoment = sequelize.define('Fmoment', {
  urlpicture: DataTypes.STRING,
  },{
    timestamps: false, // Disable timestamps
  });

// Mở kết nối Sequelize
sequelize
  .authenticate()
  .then(() => {
    console.log('Kết nối cơ sở dữ liệu thành công.');
  })
  .catch((err) => {
    console.error('Không thể kết nối cơ sở dữ liệu:', err);
  });

// Cài đặt multer cho lưu trữ tệp
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  },
});

const upload = multer({ storage: storage });

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.set('view engine', 'ejs');
app.use(express.static('public'));


app.get('/', async (req, res) => {
  try {
    const moments = await getDataFromPostgreSQL();
    res.render('moments', { moments });
  } catch (error) {
    console.error('Lỗi khi lấy dữ liệu:', error);
    res.status(500).send('Lỗi khi lấy dữ liệu');
  }

});


app.get('/moment/:id', async (req, res) => {
  const id = req.params.id;

  try {
    const moment = await Moment.findByPk(id);

    if (moment) {
      res.render('detail', { moment });
    } else {
      res.status(404).send('Không tìm thấy ảnh');
    }
  } catch (error) {
    console.error('Lỗi khi lấy chi tiết ảnh:', error);
    res.status(500).send('Lỗi khi lấy chi tiết ảnh');
  }
});

app.get('/add', (req, res) => {
  res.render('addMoment');
});

app.post('/add', (req, res) => {
  upload.single('image')(req, res, (err) => {
    if (err) {
      console.error(err);
      res.status(500).send('Lỗi khi tải tệp lên');
      return;
    }

    const { date, location, occasion, description } = req.body;

    if (!req.file) {
      res.status(400).send('Chưa tải lên tệp');
      return;
    }

    const imageUrl = `/uploads/${req.file.filename}`;

    const newMoment = {
      id: moments.length + 1, // Đây cần phải thay đổi để phản ánh ID thực tế từ cơ sở dữ liệu
      date,
      location,
      occasion,
      description,
      imageUrl,
    };

    // Thêm ảnh mới vào nguồn dữ liệu (mảng moments)
    moments.push(newMoment);

    res.redirect('/');
  });
});

app.get('/moment/:momentId', async (req, res) => {
  const momentId = req.params.momentId;
  try {
    // Lấy thông tin chi tiết của ảnh từ cơ sở dữ liệu bằng momentId
    const moment = await Moment.findByPk(momentId);
    const comments = await Comment.findAll({ where: { momentId } });

    if (moment) {
      // Render a HTML page to display the moment details
      res.render('detail', { moment, comments });
    } else {
      res.status(404).send('Moment not found');
    }
  } catch (error) {
    console.error('Lỗi khi lấy chi tiết ảnh:', error);
    res.status(500).send('Lỗi khi lấy chi tiết ảnh');
  }
});

app.post('/moment/id', async (req, res) => {
  const { displayName, commentText, momentId } = req.body;

  // Check if "displayName" is provided
  if (!displayName) {
    return res.status(400).send('Tên không được để trống');
  }

  // Check if "commentText" is provided
  if (!commentText) {
    return res.status(400).send('Nội dung bình luận không được để trống');
  }

  // Check if "momentId" is provided
  if (!momentId) {
    return res.status(400).send('momentId không được để trống');
  }

  try {
    // Create a new comment and associate it with a moment using "momentId"
    const newComment = await Comment.create({
      name: displayName,
      comment: commentText,
      momentId: momentId, // Associate the comment with the specific moment
    });

    // Return the successful response
    res.status(201).json(newComment);
  } catch (error) {
    console.error('Lỗi khi thêm bình luận:', error);
    res.status(500).send('Lỗi khi thêm bình luận');
  }
});

app.get('/comments/:momentId', async (req, res) => {
  const momentId = req.params.momentId;
  try {
    const comments = await Comment.findAll({ where: { momentId } });

    res.json(comments);
  } catch (error) {
    console.error('Lỗi khi lấy bình luận:', error);
    res.status(500).send('Lỗi khi lấy bình luận');
  }
});


app.listen(port, () => {
  console.log(`Server đang chạy tại http://localhost:${port}`);
});
