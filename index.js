const app = express();
const port = process.env.PORT || 8080;
import Sequelize from 'sequelize';


import express from 'express';
import multer from 'multer';
import path from 'path';
import bodyParser from 'body-parser';



import pkg from 'pg';

const { Client } = pkg;

const connectionInfo = {
  user: 'postgres',
  host: 'db.ivtijeamwvrwtaqqstuo.supabase.co',
  database: 'postgres',
  password: 'Cuongai@0910',
  port: 5432,
};



// Hàm để lấy dữ liệu từ PostgreSQL
async function getDataFromPostgreSQL() {
  const client = new Client(connectionInfo);

  try {
    // Kết nối đến cơ sở dữ liệu
    await client.connect();

    // Truy vấn dữ liệu từ bảng "Moments"
    const query = 'SELECT * FROM "Moments";';
    const result = await client.query(query);

    // Đóng kết nối cơ sở dữ liệu
    await client.end();

    return result.rows; // Trả về dữ liệu từ truy vấn
  } catch (error) {
    console.error('Lỗi khi lấy dữ liệu từ PostgreSQL:', error);
    throw error;
  }
}

// Sử dụng hàm để lấy dữ liệu và in ra kết quả
getDataFromPostgreSQL()
  .then((data) => {
    console.log('Dữ liệu từ PostgreSQL:', data);
  })
  .catch((error) => {
    console.error('Lỗi:', error);
  });

  app.get('/', async (req, res) => {
    try {
      // Gọi hàm để lấy dữ liệu từ PostgreSQL
      const moments = await getDataFromPostgreSQL();
  
      // Truyền dữ liệu vào template EJS (moments.ejs) và hiển thị
      res.render('moments', { moments });
    } catch (error) {
      console.error('Lỗi khi lấy dữ liệu:', error);
      res.status(500).send('Lỗi khi lấy dữ liệu');
    }
  });
  
  const sequelize = new Sequelize({
    dialect: 'postgres',
    username: 'postgres',
    password: 'Cuongai@0910',
    database: 'postgres',
    host: 'db.ivtijeamwvrwtaqqstuo.supabase.co',
    dialectOptions: {
      port: 5432, // Thay đổi thành cổng bạn muốn sử dụng
    }
  });  

  const Moment = sequelize.define('Moment', {
    urlpicture: Sequelize.STRING,
    date: Sequelize.DATE,
    location: Sequelize.STRING,
    occasion: Sequelize.STRING,
    description: Sequelize.STRING,
  }, {
    timestamps: false, // Sử dụng 'createdAt' và 'updatedAt'
  });



// Create a Sequelize instance with your database configuration
/*const sequelize = new Sequelize({
  dialect: 'mysql',
  username: 'root',
  password: null,
  database: 'photo',
  host: 'localhost',
  dialectOptions: {
    port: 5432, // Thay đổi thành cổng bạn muốn sử dụng
    }
});*/

// Test the database connection
sequelize
  .authenticate()
  .then(() => {
    console.log('Database connection has been established successfully.');
  })
  .catch((err) => {
    console.error('Unable to connect to the database:', err);
  });


  /*const Moment = sequelize.define('Moment', {
    urlpicture: Sequelize.STRING,
    date: Sequelize.DATE,
    location: Sequelize.STRING,
    occasion: Sequelize.STRING,
    description: Sequelize.STRING,
  });*/

  


const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, file.originalname);
    }
});

const upload = multer({ storage: storage });



//const bodyParser = require('body-parser');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.set('view engine', 'ejs');
app.use(express.static('public'));


/*app.get('/', async (req, res) => {
  try {
    // Lấy tất cả các dòng dữ liệu từ bảng Moment
    const moments = await Moment.findAll();

    // Truyền dữ liệu vào moments.ejs và hiển thị
    res.render('moments', { moments });
  } catch (error) {
    console.error('Lỗi khi lấy dữ liệu:', error);
    res.status(500).send('Lỗi khi lấy dữ liệu');
  }
});*/


// Sample data (you can replace this with a database)
/*const moments = [
  {
    id: 1,
    date: '2023-10-12',
    location: 'Beach',
    occasion: 'Summer Vacation',
    description: 'A fun day at the beach with friends.',
    imageUrl: '/images/photo1.jpg',
  },
  // Add more moments...
];*/

// Homepage
/*app.get('/', (req, res) => {
  res.render('moments', { moments });
});*/

// Photo detail page
app.get('/moment/:id', async (req, res) => {
  const id = req.params.id;
  
  try {
    // Lấy thông tin chi tiết của ảnh từ cơ sở dữ liệu bằng ID
    const moment = await Moment.findByPk(id);
    
    if (moment) {
      // Render một trang HTML để hiển thị chi tiết ảnh
      res.render('detail', { moment });
    } else {
      res.status(404).send('Moment not found');
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
    // Handle file upload
    upload.single('image')(req, res, (err) => {
      if (err) {
        // Handle file upload error
        console.error(err);
        res.status(500).send('File upload error');
        return;
      }
      
      // Handle form data
      const { date, location, occasion, description } = req.body;
  
      if (!req.file) {
        // Handle case where no file was uploaded
        res.status(400).send('No file uploaded');
        return;
      }
  
      // File upload was successful
      const imageUrl = `/uploads/${req.file.filename}`;
  
      // Generate a new ID for the moment (you can use a library or a database-generated ID)
      const newMoment = {
        id: moments.length + 1,
        date,
        location,
        occasion,
        description,
        imageUrl,
      };
  
      // Add the new moment to your data source (moments array)
      moments.push(newMoment);
  
      // Redirect to the homepage after adding the moment
      res.redirect('/');
    });
  });
  
  
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
