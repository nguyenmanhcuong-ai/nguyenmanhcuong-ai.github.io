const express = require('express');
const path = require('path');
const expressLayouts = require('express-ejs-layouts');
const { createClient } = require('@supabase/supabase-js');
const session = require('express-session');
require('dotenv').config();
const nodemailer = require('nodemailer');
const multer = require('multer');
const fs = require('fs'); // Thêm dòng này để import fs
const cors = require('cors');
const flash = require('express-flash');


const app = express();
app.use(cors());

// Route để phục vụ sitemap.xml
app.get('/sitemap.xml', (req, res) => {
  res.sendFile(path.join(__dirname, 'sitemap.xml'));
});

// Cấu hình express-session
app.use(session({
  secret: 'secret-key', // Thay bằng khóa bí mật của bạn
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false } // Để true nếu sử dụng HTTPS
}));

// Cấu hình express-flash
app.use(flash());

const bodyParser = require('body-parser');

// Tăng giới hạn kích thước tối đa của dữ liệu JSON
app.use(bodyParser.json({ limit: '10mb' }));

// Tăng giới hạn kích thước tối đa của dữ liệu URL-encoded
app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));


app.use(express.static('public'));


// Serve static files
app.use(express.static(path.join(__dirname, 'public')));


// Khởi tạo Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Thiết lập view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Sử dụng express-ejs-layouts

// Middleware để parse form data

// Thiết lập middleware cho session
app.use(session({
  secret: process.env.SESSION_SECRET || 'your_secret_key',
  resave: false,
  saveUninitialized: true,
  cookie: {
    maxAge: 1000 * 60 * 60 * 24 // Thời gian sống của cookie (1 ngày)
  }
}));

// Middleware để định nghĩa biến user cho tất cả routes
app.use((req, res, next) => {
  const user = req.session.user || null; // Lấy user từ session
  res.locals.user = user; // Đặt user vào res.locals
  next();
});

// Middleware để kiểm tra đăng nhập
function isAuthenticated(req, res, next) {
  if (req.session && req.session.user) {
    next(); // Nếu đã đăng nhập, tiếp tục
  } else {
    res.redirect('/'); // Nếu chưa đăng nhập, điều hướng đến trang đăng nhập
  }
}


// Route để hiển thị trang đăng nhập
app.get('/', (req, res) => {
  const error = null;
  res.render('selectlogin', { error: error });
});

app.get('/student-login', (req, res) => {
  const error = null;
  const title = "Cổng thông tin sinh viên";
  res.render('login', { error: error, title: title });
});

app.get('/lecturer-login', (req, res) => {
  const error = null;
  const title = "Đăng Nhập";
  res.render('loginlecturer', { error: error, title: title });
});


// Đăng nhập
const loginAttempts = {};
const LOCK_TIME = 10 * 60 * 1000; // 10 phút


app.post('/auth/lecturer-login', async (req, res) => {
  const { username, password } = req.body;

  // Khởi tạo số lần đăng nhập cho người dùng nếu chưa có
  if (!loginAttempts[username]) {
    loginAttempts[username] = { count: 0, lockedUntil: null };
  }

  // Kiểm tra nếu tài khoản đã bị khóa
  const { count, lockedUntil } = loginAttempts[username];
  if (lockedUntil && Date.now() < lockedUntil) {
    const remainingTime = Math.ceil((lockedUntil - Date.now()) / 1000);
    return res.render('loginlecturer', { error: `Tài khoản đã bị khóa. Vui lòng thử lại sau ${remainingTime} giây.`, title: 'Đăng Nhập Admin' });
  } else if (lockedUntil && Date.now() >= lockedUntil) {
    // Đặt lại số lần đăng nhập sai và thời gian khóa khi mở khóa
    loginAttempts[username] = { count: 0, lockedUntil: null };
  }

  // Kiểm tra nếu username và password là admin
  if (username === 'cuongnguyen' && password === 'cuongnguyen') {
    // Lưu thông tin admin vào session
    req.session.user = { username: 'admin', isAdmin: true };
    return res.redirect('/admin/dashboard');
  }

  // Nếu không phải admin, tăng số lần đăng nhập sai
  loginAttempts[username].count += 1;

  // Kiểm tra nếu đạt 3 lần đăng nhập sai
  if (loginAttempts[username].count >= 3) {
    loginAttempts[username].lockedUntil = Date.now() + LOCK_TIME; // Khóa tài khoản
    return res.render('loginlecturer', { error: 'Tài khoản đã bị khóa do quá nhiều lần đăng nhập sai. Vui lòng thử lại sau 10 phút.', title: 'Đăng Nhập Admin' });
  }

  return res.render('loginlecturer', { error: 'Tên đăng nhập hoặc mật khẩu không đúng.', title: 'Đăng Nhập Admin' });
});







app.post('/auth/login', async (req, res) => {
  const { username, password } = req.body;

  // Khởi tạo số lần đăng nhập cho người dùng nếu chưa có
  if (!loginAttempts[username]) {
    loginAttempts[username] = { count: 0, lockedUntil: null };
  }

  // Kiểm tra nếu tài khoản đã bị khóa
  const { count, lockedUntil } = loginAttempts[username];
  if (lockedUntil && Date.now() < lockedUntil) {
    const remainingTime = Math.ceil((lockedUntil - Date.now()) / 1000);
    return res.render('login', { error: `Tài khoản đã bị khóa. Vui lòng thử lại sau ${remainingTime} giây.`, title: 'Đăng Nhập' });
  } else if (lockedUntil && Date.now() >= lockedUntil) {
    // Đặt lại số lần đăng nhập sai và thời gian khóa khi mở khóa
    loginAttempts[username] = { count: 0, lockedUntil: null };
  }

  // Kiểm tra nếu username và password là admin
  if (username === 'cuongnguyen' && password === 'cuongnguyen') {
    // Lưu thông tin admin vào session
    req.session.user = { username: 'admin', isAdmin: true };
    return res.redirect('/admin/dashboard');
  }

  try {
    // Kiểm tra tài khoản từ bảng users
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .eq('password', password)
      .single();

    // Kiểm tra nếu không tìm thấy người dùng
    if (error || !user) {
      // Tăng số lần đăng nhập sai
      loginAttempts[username].count += 1;

      // Kiểm tra nếu đạt 3 lần đăng nhập sai
      if (loginAttempts[username].count >= 3) {
        loginAttempts[username].lockedUntil = Date.now() + LOCK_TIME; // Khóa tài khoản
        return res.render('login', { error: 'Tài khoản đã bị khóa do quá nhiều lần đăng nhập sai. Vui lòng thử lại sau 10 phút.', title: 'Đăng Nhập' });
      }

      return res.render('login', { error: 'Tên đăng nhập hoặc mật khẩu không đúng.', title: 'Đăng Nhập' });
    }

    // Nếu là sinh viên, kiểm tra trạng thái tốt nghiệp
    if (!user.isAdmin) {
      const { data: graduationRecords, error: graduationError } = await supabase
        .from('graduation')
        .select('isgraduation')
        .eq('iduser', user.iduser);

      if (graduationError) {
        console.error('Error fetching graduation records:', graduationError);
        return res.render('login', { error: 'Đã có lỗi xảy ra. Vui lòng thử lại.', title: 'Đăng Nhập' });
      }

      // Kiểm tra nếu tất cả các cột isgraduation đều là true
      const allGraduated = graduationRecords.every(record => record.isgraduation === true);

      if (allGraduated) {
        return res.render('login', { error: 'Tài khoản đã bị khóa vì sinh viên đã tốt nghiệp tất cả các khóa.', title: 'Đăng Nhập' });
      }
    }

    // Đặt lại số lần đăng nhập sai nếu thành công
    loginAttempts[username] = { count: 0, lockedUntil: null };

    // Lưu thông tin user vào session
    req.session.user = user;

    // Chuyển hướng đến dashboard của sinh viên
    return res.redirect(`/students/${user.iduser}/home`);
  } catch (error) {
    console.error(error);
    return res.render('login', { error: 'Đã có lỗi xảy ra. Vui lòng thử lại.', title: 'Đăng Nhập' });
  }
});

// Route để hiển thị dashboard admin
app.get('/admin/dashboard', isAuthenticated, async (req, res) => {
  if (req.session.user.isAdmin) {
    try {
      const { data: classes, error: classesError } = await supabase.from('classes').select('*');
      const { data: attendances, error: attendancesError } = await supabase.from('attendances').select('*');

      if (classesError || attendancesError) {
        throw new Error('Error fetching data');
      }

      // Nhóm các lớp để loại bỏ các bản sao
      const uniqueClasses = [];
      const seen = new Set();

      classes.forEach(classItem => {
        const identifier = `${classItem.idclass}-${classItem.nameclass}-${classItem.createdat}`;

        if (!seen.has(identifier)) {
          seen.add(identifier);
          uniqueClasses.push(classItem);
        }
      });

      res.render('admin/dashboard', {
        title: 'Admin Cường Nguyễn',
        classes: uniqueClasses, // Gửi danh sách lớp đã được nhóm
        attendances,
      });
    } catch (err) {
      console.error(err);
      res.send("Error fetching data");
    }
  } else {
    res.redirect(`/students/${req.session.user.iduser}/home`); // Nếu không phải admin, điều hướng đến trang sinh viên
  }
});
function truncateText(text, wordLimit) {
  const words = text.split(/\s+/);
  if (words.length > wordLimit) {
    return words.slice(0, wordLimit).join(' ') + '...';
  }
  return text;
}
// Route để hiển thị dashboard của sinh viên
app.get('/students/:iduser/home', isAuthenticated, async (req, res) => {
  const { iduser } = req.params;

  // Kiểm tra xem người dùng có phải là sinh viên không
  if (req.session.user.iduser === iduser) {
    try {
      // Lấy danh sách idclass của sinh viên từ bảng classes
      const { data: classes, error: classError } = await supabase
        .from('classes')
        .select('idclass')
        .eq('iduser', iduser); // Lọc theo iduser của sinh viên

      if (classError) throw classError;

      // Chuyển đổi classes thành mảng idclass
      const idclasses = classes.map(c => c.idclass);

      // Lấy danh sách thông báo cho tất cả các lớp học của sinh viên
      const { data: notifications, error: notificationError } = await supabase
        .from('information')
        .select('*')
        .in('idclass', idclasses) // Sử dụng mảng idclass để lấy thông báo
        .order('createdat', { ascending: false })
        .limit(10); // Lấy 10 thông báo gần nhất

      if (notificationError) throw notificationError;

      // Render EJS với dữ liệu notifications
      res.render('students/home', {
        title: 'Dashboard Sinh Viên',
        user: req.session.user,
        truncateText: truncateText,
        notifications: notifications || [] // Đảm bảo notifications không bị undefined
      });
    } catch (error) {
      console.error('Lỗi khi lấy thông báo:', error);
      res.status(500).send('Có lỗi xảy ra khi lấy thông báo.');
    }
  } else {
    res.redirect('/'); // Điều hướng về trang đăng nhập nếu không đúng
  }
});

// Route để hiển thị danh sách sinh viên của lớp
// Route để hiển thị danh sách sinh viên của lớp
// Route để hiển thị danh sách sinh viên của lớp
app.get('/classes/:idclass/students', isAuthenticated, async (req, res) => {
  const { idclass } = req.params;

  // Truy vấn bảng `classes` để lấy danh sách `iduser` tương ứng
  const { data: classData, error: classError } = await supabase
    .from('classes')
    .select('iduser')
    .eq('idclass', idclass);

  if (classError) {
    return res.status(500).json({ message: 'Lỗi truy vấn bảng classes' });
  }

  const studentIds = classData.map(cls => cls.iduser);

  if (studentIds.length === 0) {
    return res.render('students', { title: 'Danh Sách Sinh Viên', idclass, students: [] });
  }

  // Truy vấn bảng `users` để lấy thông tin sinh viên
  const { data: studentsData, error: studentsError } = await supabase
    .from('users')
    .select('*')
    .in('iduser', studentIds);

  if (studentsError) {
    return res.status(500).json({ message: 'Lỗi truy vấn bảng users' });
  }

  // Render trang với dữ liệu sinh viên
  res.render('students', { title: 'Danh Sách Sinh Viên', idclass, students: studentsData });
});



// Cấu hình thông tin tài khoản email
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com', // Thay đổi với SMTP server của bạn
  port: 587, // Thay đổi nếu cần thiết
  secure: false, // true cho 465, false cho các cổng khác
  auth: {
    user: 'minhph313@gmail.com', // Thay đổi với email của bạn
    pass: 'eucr txgk ikgx ngqd' // Thay đổi với mật khẩu của bạn
  }
});


/*app.post('/admin/create-class', isAuthenticated, async (req, res) => {
  const { classCode, className, studentId, fullName, phone, currentResidence, email } = req.body;

  // Tạo username và password từ email
  const username = email.split('@')[0];
  const password = username; // Sử dụng username làm password mặc định
  const localDateString = new Date().toISOString(); // Thời gian hiện tại theo giờ UTC

  try {
      // Thêm thông tin sinh viên vào bảng users
      const { error: userError } = await supabase
          .from('users')
          .insert([{
              iduser: studentId,
              fullname: fullName,
              isadmin: false,
              phone: phone,
              current_residence: currentResidence,
              email: email,
              username: username,
              password: password,
          }]);

      if (userError) throw userError; // Nếu có lỗi, throw ra để xử lý

      // Thêm thông tin lớp vào bảng classes
      const { error: classError } = await supabase
          .from('classes')
          .insert([{
              idclass: classCode, // Đảm bảo mã lớp được sử dụng
              nameclass: className,
              createdat: localDateString, // Lưu thời gian cục bộ vào cơ sở dữ liệu
              iduser: studentId
          }]);

      if (classError) throw classError; // Nếu có lỗi, throw ra để xử lý

      // Thêm thông tin vào bảng status_class
      const { error: statusError } = await supabase
          .from('status_class')
          .insert([{
              idclass: classCode,
              status: false, // Giả định trạng thái mặc định là 'active'
          }]);

      if (statusError) throw statusError; // Nếu có lỗi, throw ra để xử lý

      // Gửi email thông báo cho sinh viên
      const mailOptions = {
          from: 'minhph313@gmail.com', // Email của bạn
          to: email, // Địa chỉ email của sinh viên
          subject: 'Thông báo tham gia lớp học mới',
          html: `<!DOCTYPE html>
                <html lang="vi">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Thông báo tham gia lớp học mới</title>
                    <style>
                        body {
                            font-family: Arial, sans-serif;
                            line-height: 1.6;
                            color: #333;
                            max-width: 600px;
                            margin: 0 auto;
                            padding: 20px;
                        }
                        h1 {
                            color: #2c3e50;
                            border-bottom: 2px solid #3498db;
                            padding-bottom: 10px;
                        }
                        .highlight {
                            font-size: 1.2em;
                            font-weight: bold;
                            color: #2980b9;
                        }
                        .important {
                            font-size: 1.2em;
                            font-weight: bold;
                            color: #e74c3c;
                        }
                        ul {
                            list-style-type: none;
                            padding-left: 0;
                        }
                        li {
                            margin-bottom: 10px;
                        }
                        .footer {
                            margin-top: 20px;
                            font-style: italic;
                            color: #7f8c8d;
                        }
                    </style>
                </head>
                <body>
                    <h1>Chào mừng bạn tham gia lớp học mới!</h1>
                    <p>Xin chào <span class="highlight">${fullName}</span>,</p>
                    <p>Chúc mừng! Bạn đã tham gia vào lớp học mới thành công. Dưới đây là thông tin chi tiết:</p>
                    <ul>
                        <li>ID Sinh viên: <span class="highlight">${studentId}</span></li>
                        <li>Mã lớp: <span class="highlight">${classCode}</span></li>
                        <li>Tên lớp: <span class="highlight">${className}</span></li>
                        <li>Tên đăng nhập: <span class="important">${username}</span></li>
                        <li>Mật khẩu: <span class="important">${password}</span></li>
                    </ul>
                    <p class="footer">Chúc bạn học tập tốt và thành công trong khóa học mới!</p>
                    <p style="margin: 0; font-family: Arial, sans-serif; font-size: 14px; color: #333;">
                        Trân trọng,<br>
                        <strong style="font-size: 16px; color: #2980b9;">Cuong Nguyen</strong><br>
                        <span style="color: #7f8c8d;">Chuyên luyện thi chứng chỉ tiếng anh Đ</span><br>
                        <span style="color: #7f8c8d;">Email: minhph313@gmail.com</span><br>
                        <span style="color: #7f8c8d;">Điện thoại: 0901234567</span><br>
                        <span style="color: #7f8c8d;">Địa chỉ: Quận 7 - Tp Hồ Chí Minh</span><br>
                        <a href="https://www.facebook.com/09nmc" style="color: #3498db; text-decoration: none;">Facebook</a> |
                    </p>
                </body>
                </html>`
      };

      await transporter.sendMail(mailOptions);

      // Điều hướng về trang dashboard hoặc trang xác nhận
      res.redirect('/admin/dashboard');
  } catch (error) {
      res.render('admin/createClass', {
          message: 'Có lỗi xảy ra: ' + error.message,
          type: 'error'
      });
  }
});*/


// Route xóa lớp học
app.post('/admin/delete-class/:id', async (req, res) => {
  const classId = req.params.id;

  // Xóa lớp học
  const { error: classError } = await supabase
    .from('classes')
    .delete()
    .eq('idclass', classId);

  // Xóa sinh viên trong lớp
  const { error: studentsError } = await supabase
    .from('attendances')
    .delete()
    .eq('idclass', classId);

  // Xóa trạng thái trong lớp
  const { error: statusError } = await supabase
    .from('status_class')
    .delete()
    .eq('idclass', classId);

  if (classError || studentsError || statusError) {
    return res.status(500).send('Có lỗi xảy ra trong quá trình xóa lớp học.');
  }

  res.redirect('/admin/dashboard'); // Chuyển hướng về trang dashboard
});


// Route để tạo lớp mới
app.get('/admin/create-class', isAuthenticated, (req, res) => {
  if (req.session.user.isAdmin) {
    res.render('admin/createClass', {
      title: 'Tạo lớp mới'
    });
  } else {
    res.redirect(`/students/${req.session.user.iduser}/home`); // Nếu không phải admin
  }
});

// Xử lý tạo lớp mới
app.post('/admin/create-class', isAuthenticated, async (req, res) => {
  const { classCode, className } = req.body;

  try {
    // Thêm thông tin lớp vào bảng classes
    const { error: classError } = await supabase
      .from('classes')
      .insert([{
        idclass: classCode, // Mã lớp
        nameclass: className, // Tên lớp
        createdat: new Date().toISOString(), // Thời gian tạo lớp
        iduser: null, // Để trống iduser
        course_detail: null // Để trống course_detail
      }]);

    if (classError) throw classError; // Nếu có lỗi, throw ra để xử lý

    // Thêm thông tin vào bảng status_class
    const { error: statusError } = await supabase
      .from('status_class')
      .insert([{
        idclass: classCode,
        status: false, // Giả định trạng thái mặc định là 'active'
      }]);

    if (statusError) {
      console.error('Lỗi khi thêm vào bảng status_class:', statusError);
      return res.status(500).json({ success: false, message: 'Có lỗi xảy ra khi thêm vào bảng status_class: ' + statusError.message });
    }
    // Điều hướng về trang dashboard hoặc trang xác nhận
    res.redirect('/admin/dashboard');
  } catch (error) {
    console.error(error);
    res.status(500).send('Lỗi khi tạo lớp.');
  }
});


// Trang tạo form điểm danh
app.get('/attendance-form', isAuthenticated, async (req, res) => {
  try {
    const { data: classes, error } = await supabase.from('classes').select('*');
    if (error) throw error;
    res.render('attendance-form', { classes });
  } catch (error) {
    console.error(error);
    res.status(500).send('Lỗi khi lấy dữ liệu lớp.');
  }
});

// Xử lý dữ liệu điểm danh
app.post('/attendance', isAuthenticated, async (req, res) => {
  const { month, idclass, students } = req.body;
  const currentTime = new Date();

  try {
    for (const studentId of students) {
      await supabase
        .from('attendances')
        .insert([{ idUser: studentId, idclass, check_status: true, time: currentTime }]);
    }
    res.send('Điểm danh thành công!');
  } catch (error) {
    console.error(error);
    res.status(500).send('Lỗi khi lưu dữ liệu điểm danh.');
  }
});

// Route để lấy danh sách sinh viên theo mã lớp
app.get('/classes/:classCode/students', async (req, res) => {
  const classCode = req.params.classCode;

  try {
    const { data: students, error } = await supabase
      .from('users')
      .select('iduser, fullname')
      .eq('idclass', classCode);

    if (error) {
      throw error;
    }

    if (students.length === 0) {
      return res.status(404).json({ message: 'Không tìm thấy sinh viên trong lớp này.' });
    }

    res.json({ students });
  } catch (error) {
    console.error('Error fetching students:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Route để đăng xuất
app.get('/auth/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      console.error(err);
      return res.redirect('/'); // Redirect về trang chủ nếu có lỗi
    }
    res.redirect('/'); // Redirect về trang chủ sau khi đăng xuất thành công
  });
});

app.get('/students/:iduser/attendance/:idclass', async (req, res) => {
  const { iduser, idclass } = req.params;

  try {
    // Truy vấn thông tin sinh viên
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('iduser', iduser)
      .single();

    if (userError) throw userError;

    // Truy vấn dữ liệu điểm danh theo iduser và idclass
    const { data: attendanceRecords, error: attendanceError } = await supabase
      .from('attendances')
      .select('*')
      .eq('iduser', iduser)
      .eq('idclass', idclass);

    if (attendanceError) throw attendanceError;

    const isAdmin = req.session.user.isAdmin; // Kiểm tra isAdmin từ session

    // Gửi dữ liệu đến view
    res.render('students/attendance', {
      title: 'Lịch Sử Điểm Danh',
      user: user,
      iduser: iduser,
      idclass: idclass,
      attendanceRecords: attendanceRecords || [],
      isAdmin: isAdmin
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('Có lỗi xảy ra khi lấy dữ liệu.');
  }
});



app.get('/admin/class/:idclass', isAuthenticated, async (req, res) => {
  const { idclass } = req.params;

  try {
    // Lấy thông tin lớp từ bảng classes
    const { data: classData, error: classError } = await supabase
      .from('classes')
      .select('nameclass')
      .eq('idclass', idclass)
      .single(); // Lấy một kết quả duy nhất

    if (classError) throw classError;

    // Lấy danh sách sinh viên trong lớp từ bảng users
    const { data: students, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('idclass', idclass);

    if (userError) throw userError;

    // Render trang students.ejs với dữ liệu cần thiết
    res.render('students', {
      title: 'Quản lý sinh viên',
      idclass: idclass,
      className: classData.nameclass, // Truyền tên lớp vào view
      students: students
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('Lỗi khi lấy dữ liệu lớp và sinh viên.');
  }
});

// app.js
app.post('/students/add', isAuthenticated, async (req, res) => {
  console.log('Dữ liệu nhận được từ client:', req.body);

  const { studentId, fullName, phone, currentResidence, email, classCode } = req.body;

  // Kiểm tra các trường bắt buộc
  if (!studentId || !fullName || !phone || !currentResidence || !email || !classCode) {
    return res.status(400).json({ success: false, message: 'Thiếu thông tin cần thiết.' });
  }

  // Kiểm tra định dạng email
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(email)) {
    return res.status(400).json({ success: false, message: 'Địa chỉ email không hợp lệ.' });
  }

  // Kiểm tra định dạng số điện thoại
  const phonePattern = /^\d{10,15}$/;
  if (!phonePattern.test(phone)) {
    return res.status(400).json({ success: false, message: 'Số điện thoại không hợp lệ.' });
  }

  // Hàm tạo mật khẩu ngẫu nhiên
  const generatePassword = (length) => {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let password = '';
    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * characters.length);
      password += characters[randomIndex];
    }
    return password;
  };

  const password = generatePassword(10); // Tạo mật khẩu ngẫu nhiên 10 ký tự

  const username = email.split('@')[0];
  //const password = username; // Sử dụng username làm password mặc định

  try {
    // Kiểm tra sinh viên có tồn tại trong bảng users hay chưa
    const { data: existingUser, error: userCheckError } = await supabase
      .from('users')
      .select('iduser')
      .eq('iduser', studentId)
      .single();

    if (userCheckError && userCheckError.code !== 'PGRST116') {
      console.error('Lỗi khi kiểm tra sinh viên:', userCheckError);
      return res.status(500).json({ success: false, message: 'Lỗi khi kiểm tra sinh viên.' });
    }

    // Nếu sinh viên không tồn tại, thêm sinh viên vào bảng users
    if (!existingUser) {
      const { data: newUser, error: userInsertError } = await supabase
        .from('users')
        .insert({
          iduser: studentId,
          fullname: fullName,
          email: email,
          phone: phone,
          current_residence: currentResidence,
          username: username,
          password: password,
        })
        .select();

      if (userInsertError) {
        console.error('Lỗi khi thêm sinh viên:', userInsertError);
        return res.status(500).json({ success: false, message: 'Lỗi khi thêm sinh viên: ' + userInsertError.message });
      }
    }

    // Kiểm tra lớp có tồn tại trong bảng classes hay không
    const { data: classData, error: classError } = await supabase
      .from('classes')
      .select('idclass, iduser, nameclass, createdat, course_detail')
      .eq('idclass', classCode)
      .limit(1)
      .single();

    if (classError || !classData) {
      return res.status(400).json({ success: false, message: 'Lớp không tồn tại.' });
    }

    // Kiểm tra xem iduser trong lớp có phải là null không
    if (classData.iduser === null) {
      // Nếu iduser là null, cập nhật iduser cho hàng đó
      const { error: classUpdateError } = await supabase
        .from('classes')
        .update({ iduser: studentId })
        .eq('idclass', classCode)
        .is('iduser', null); // Chỉ cập nhật nếu iduser là null

      if (classUpdateError) {
        console.error('Lỗi khi cập nhật sinh viên vào lớp:', classUpdateError);
        return res.status(500).json({ success: false, message: 'Có lỗi xảy ra khi cập nhật sinh viên vào lớp: ' + classUpdateError.message });
      }
    } else {
      // Nếu iduser đã có giá trị (không null), thêm một hàng mới
      const { error: classInsertError } = await supabase
        .from('classes')
        .insert({
          iduser: studentId,
          idclass: classCode,
          nameclass: classData.nameclass,
          createdat: classData.createdat,
          course_detail: classData.course_detail
        });

      if (classInsertError) {
        console.error('Lỗi khi thêm vào bảng classes:', classInsertError);
        return res.status(500).json({ success: false, message: 'Có lỗi xảy ra khi thêm vào bảng classes: ' + classInsertError.message });
      }

    }
        // Thêm thông tin vào bảng graduation
        const { error: graduationInsertError } = await supabase
        .from('graduation')
        .insert({
          iduser: studentId,
          idclass: classCode,
          evaluation1: null,
          evaluation2: null,
          evaluation3: null,
          evaluation4: null,
          evaluation5: null,
          evaluation6: null,
          evaluation7: null,
          evaluation8: null,
          evaluation9: null,
          evaluation10: null,
          evaluation11: null,
          evaluation12: null,
          rank: null,
          isgraduation: false
        });
  
      if (graduationInsertError) {
        console.error('Lỗi khi thêm thông tin vào bảng graduation:', graduationInsertError);
        return res.status(500).json({ success: false, message: 'Có lỗi xảy ra khi thêm thông tin vào bảng graduation: ' + graduationInsertError.message });
      }
  

    res.json({ success: true, message: 'Thêm sinh viên vào lớp thành công!', studentId, classCode, className: classData.nameclass });

    // Gửi email thông báo cho sinh viên
    const mailOptions = {
      from: 'minhph313@gmail.com', // Email của bạn
      to: email, // Địa chỉ email của sinh viên
      subject: 'Thông báo tham gia lớp học mới',
      html: `<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Thông báo tham gia lớp học mới</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }
        h1 {
            color: #2c3e50;
            border-bottom: 2px solid #3498db;
            padding-bottom: 10px;
        }
        .highlight {
            font-size: 1.2em;
            font-weight: bold;
            color: #2980b9;
        }
        .important {
            font-size: 1.2em;
            font-weight: bold;
            color: #e74c3c;
        }
        ul {
            list-style-type: none;
            padding-left: 0;
        }
        li {
            margin-bottom: 10px;
        }
        .footer {
            margin-top: 20px;
            font-style: italic;
            color: #7f8c8d;
        }
    </style>
</head>
<body>
    <h1>Chào mừng bạn tham gia lớp học mới!</h1>
    <p>Xin chào <span class="highlight">${fullName}</span>,</p>
    <p>Chúc mừng! Bạn đã tham gia vào lớp học mới thành công. Dưới đây là thông tin chi tiết:</p>
    <ul>
        <li>ID Sinh viên: <span class="highlight">${studentId}</span></li>
        <li>Tên lớp: <span class="highlight">${classData.nameclass}</span></li>
        <li>Mã lớp: <span class="highlight">${classCode}</span></li>
        <li>Tên đăng nhập: <span class="important">${username}</span></li>
        <li>Mật khẩu: <span class="important">${password}</span></li>
    </ul>
    <p style="font-style: italic;">Lưu ý: Nếu sinh viên đã có tài khoản từ trước thì dùng mật khẩu cũ để đăng nhập.</p>
    
    <p>Để truy cập vào hệ thống của chúng tôi, vui lòng nhấp vào liên kết sau: 
        <a href="https://mccheckin.edu.vn" style="color: #3498db; text-decoration: none; font-weight: bold;">MC Đăng Nhập</a>
    </p>
    
    <p class="footer">Chúc bạn học tập tốt và thành công trong khóa học mới!</p>
    <p style="margin: 0; font-family: Arial, sans-serif; font-size: 14px; color: #333;">
        Trân trọng,<br>
        <strong style="font-size: 16px; color: #2980b9;">Cuong Nguyen</strong><br>
        <span style="color: #7f8c8d;">Chuyên luyện thi chứng chỉ tiếng anh</span><br>
        <span style="color: #7f8c8d;">Email: minhph313@gmail.com</span><br>
        <span style="color: #7f8c8d;">Điện thoại: 0901234567</span><br>
        <span style="color: #7f8c8d;">Địa chỉ: Quận 7 - Tp Hồ Chí Minh</span><br>
        <a href="https://www.facebook.com/09nmc" style="color: #3498db; text-decoration: none;">Facebook</a>
    </p>
</body>

              </html>`
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error('Lỗi khi gửi email:', error);
      } else {
        console.log('Email đã được gửi:', info.response);
      }
    });

  } catch (error) {
    console.error('Lỗi không xác định:', error);
    res.status(500).json({ success: false, message: 'Đã xảy ra lỗi không xác định.' });
  }
});


app.delete('/admin/delete-student/:studentId/:classId', isAuthenticated, async (req, res) => {
  const { studentId, classId } = req.params;
  console.log(req.params);
  const decodedClassId = decodeURIComponent(classId); // Giải mã classId

  try {
    // Kiểm tra số lần sinh viên có mặt trong bảng classes
    const { count, error: countError } = await supabase
      .from('classes')
      .select('iduser', { count: 'exact' })
      .eq('iduser', studentId);

    if (countError) throw countError;

    // Nếu sinh viên chỉ có mặt một lần trong bảng classes
    if (count === 1) {
      // Bắt đầu transaction: Xóa sinh viên khỏi bảng 'users' và 'classes'
      const { error: classStudentError } = await supabase
        .from('classes')
        .delete()
        .eq('iduser', studentId)
        .eq('idclass', decodedClassId); // Sử dụng idclass đã giải mã

      if (classStudentError) throw classStudentError;

          // Xóa tất cả dòng trong bảng attendances có iduser và idclass tương ứng
    const { error: attendanceDeleteError } = await supabase
    .from('attendances')
    .delete()
    .eq('iduser', studentId)
    .eq('idclass', decodedClassId); // Sử dụng idclass đã giải mã

  if (attendanceDeleteError) throw attendanceDeleteError;


      // Xóa sinh viên khỏi bảng 'users'
      const { error: userError } = await supabase
        .from('users')
        .delete()
        .eq('iduser', studentId); // Xóa theo iduser

      if (userError) throw userError;

      res.status(200).json({
        success: true,
        message: 'Đã xóa sinh viên khỏi lớp và bảng người dùng thành công.',
      });
    } else {
      // Nếu sinh viên có mặt nhiều lần trong bảng classes
      const { error: classDeleteError } = await supabase
        .from('classes')
        .delete()
        .eq('iduser', studentId)
        .eq('idclass', decodedClassId); // Sử dụng idclass đã giải mã

      if (classDeleteError) throw classDeleteError;

      res.status(200).json({
        success: true,
        message: 'Đã xóa sinh viên khỏi lớp thành công.',
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Có lỗi xảy ra khi xóa sinh viên.',
    });
  }
});

app.post('/admin/pay-fee', isAuthenticated, async (req, res) => {
  const { iduser, idclass, month, pay_status } = req.body;
  console.log(req.body);

  // Kiểm tra xem tất cả các trường có tồn tại không
  if (!iduser || !idclass || !month || pay_status === undefined) {
    return res.status(400).json({ message: 'Thiếu thông tin cần thiết.' });
  }

  try {
    // Kiểm tra xem học phí đã được nộp cho tháng này chưa
    const { data: existingFee, error: checkError } = await supabase
      .from('fee')
      .select('*')
      .eq('iduser', iduser)
      .eq('idclass', idclass)
      .eq('month_fee', month)
      .eq('pay_status', true)
      .single();

    console.log('existingFee:', existingFee);
    console.log('checkError:', checkError);

    // Xử lý nếu có lỗi khác ngoài lỗi "no rows found"
    if (checkError && checkError.code !== 'PGRST116') throw checkError;

    // Nếu đã tồn tại bản ghi nộp học phí, thông báo và không cho nộp lại
    if (existingFee) {
      return res.status(400).json({ message: 'Học phí tháng này đã được nộp.' });
    }

    // Tạo thời gian nộp học phí
    const payment_time = new Date().toISOString();

    // Thêm thông tin nộp học phí vào bảng fee
    const { error: feeError } = await supabase
      .from('fee')
      .insert([{
        iduser: iduser,
        idclass: idclass,
        pay_status: pay_status,
        month_fee: month,
        payment_time: payment_time,
      }]);

    if (feeError) throw feeError; // Nếu có lỗi, throw ra để xử lý

    // Gửi phản hồi thành công
    res.status(200).json({ message: 'Nộp học phí thành công!' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi khi nộp học phí.' });
  }
});
//app.get api ... chua thay anh huong
app.get('/api/get-fee-status', (req, res) => {
  const { iduser, idclass, month } = req.query;

  // Lấy trạng thái nộp học phí từ cơ sở dữ liệu
  supabase
    .from('fee')
    .select('pay_status')
    .eq('iduser', iduser)
    .eq('idclass', idclass)
    .eq('month_fee', month)
    .then(({ data, error }) => {
      if (error) {
        console.error('Error fetching fee status:', error);
        return res.status(500).json({ error: 'Lỗi khi lấy dữ liệu từ cơ sở dữ liệu.' });
      }

      // Kiểm tra nếu không có dữ liệu nào được trả về
      if (!data || data.length === 0) {
        return res.json({ isPaid: false });
      }

      // Trả về trạng thái nộp học phí
      res.json({ isPaid: !!data[0].pay_status }); // Chuyển đổi thành boolean
    })
    .catch(error => {
      console.error('Error fetching fee status:', error);
      res.status(500).json({ error: 'Lỗi không xác định khi lấy dữ liệu.' });
    });
});

app.get('/admin/fee-history/:iduser/:idclass', isAuthenticated, async (req, res) => {
  const { iduser, idclass } = req.params;

  try {
    // Truy vấn dữ liệu từ bảng fee dựa trên idclass
    const { data: feeRecords, error } = await supabase
      .from('fee')
      .select(`*
          , users (fullname)`)
      .eq('iduser', iduser)
      .eq('idclass', idclass);  // So sánh idclass

    if (error) {
      throw error;
    }

    // Render trang lịch sử đóng phí
    res.render('feeHistory', { title: 'Lịch sử đóng phí', feeRecords, idclass });
  } catch (err) {
    console.error(err);
    res.status(500).send('Có lỗi xảy ra khi truy vấn dữ liệu.');
  }
});



// SINH VIEN
app.get('/students/:userId/home', async (req, res) => {
  try {
    const userId = req.params.userId;
    console.log('Requested userId:', userId);

    // Fetch user data
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('iduser', userId)
      .single();

    if (userError) {
      console.error('Error fetching user:', userError);
      return res.status(500).send('Error fetching user data');
    }

    if (!user) {
      console.log('User not found');
      return res.status(404).send('User not found');
    }

    console.log('User data:', user);

    // Fetch classes data
    const { data: classes, error: classesError } = await supabase
      .from('classes')
      .select('*')
      .eq('idclass', user.idclass);

    if (classesError) {
      console.error('Error fetching classes:', classesError);
      // Instead of returning an error, we'll pass an empty array
      classes = [];
    }

    console.log('Classes data:', classes);

    // Render the template with user and classes data
    res.render('students/home', {
      title: 'Student Dashboard',
      user: user,
      classes: classes || [] // Ensure classes is always defined, even if empty
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    res.status(500).send('Internal Server Error');
  }
});

app.post('/update-profile', async (req, res) => {
  const { fullname, email, phone, current_residence } = req.body;
  const userId = req.session.user.iduser;

  try {
    // Tạo đối tượng chỉ chứa các trường được cập nhật
    let updateFields = {};
    if (fullname) updateFields.fullname = fullname;
    if (email) updateFields.email = email;
    if (phone) updateFields.phone = phone;
    if (current_residence) updateFields.current_residence = current_residence;

    // Gửi truy vấn cập nhật thông tin vào database
    let { data, error } = await supabase
      .from('users')
      .update(updateFields)
      .eq('iduser', userId);

    if (error) throw error;

    res.json({ success: true });
  } catch (error) {
    console.error('Lỗi cập nhật thông tin:', error);
    res.json({ success: false, message: 'Có lỗi xảy ra khi cập nhật thông tin.' });
  }
});

// app.js
// Route để hiển thị lớp học của sinh viên
// Route để hiển thị lớp học của sinh viên dựa trên userId
app.get('/studentclass/:userId', isAuthenticated, async (req, res) => {
  const userId = req.params.userId; // Lấy userId từ URL

  try {
    // Lấy danh sách lớp học của sinh viên từ bảng classes
    const { data: classes, error } = await supabase
      .from('classes')
      .select('*')
      .eq('iduser', userId); // So sánh iduser trong bảng classes với userId

    if (error) {
      console.error('Lỗi khi lấy lớp học:', error);
      return res.status(500).send('Lỗi khi lấy lớp học.');
    }

    // Nếu không tìm thấy lớp học nào
    if (!classes || classes.length === 0) {
      return res.render('studentclass', { userId, classes: [] }); // Gửi danh sách rỗng
    }

    // Truyền dữ liệu lớp học vào EJS
    res.render('studentclass', { userId, classes });
  } catch (err) {
    console.error('Lỗi:', err);
    res.status(500).send('Có lỗi xảy ra.');
  }
});



app.get('/course-details/:idclass',isAuthenticated, async (req, res) => {
  const { idclass } = req.params;
  const userId = req.session.user.iduser; // Lấy iduser từ phiên làm việc

  // Truy vấn lấy đường dẫn PDF và ngày tạo lớp từ bảng classes
  const { data, error } = await supabase
      .from('classes')
      .select('course_detail, createdat') // Lấy cả course_detail và createdat
      .eq('idclass', idclass)
      .eq('iduser', userId) // Giả sử có trường iduser trong bảng classes
      .single();

  if (error || !data) {
      return res.status(404).send('Không tìm thấy khóa học hoặc bạn không có quyền truy cập');
  }

  // Định dạng ngày theo dạng dd/mm/yyyy
  const createdAtDate = new Date(data.createdat);
  const day = String(createdAtDate.getDate()).padStart(2, '0');
  const month = String(createdAtDate.getMonth() + 1).padStart(2, '0'); // Tháng 0-11
  const year = createdAtDate.getFullYear();

  const formattedDate = `${day}/${month}/${year}`;

  // Render trang coursedetail.ejs với đường dẫn PDF và ngày tạo lớp
  res.render('coursedetail', { 
      pdfUrl: data.course_detail,
      courseStartDate: formattedDate // Truyền ngày đã định dạng vào template
  });
});



app.get('/profile', (req, res) => {
  // Kiểm tra xem người dùng đã đăng nhập chưa
  if (!req.session.user) {
    return res.redirect('/login'); // Chuyển hướng đến trang đăng nhập nếu chưa đăng nhập
  }

  // Nếu đã đăng nhập, hiển thị trang profile
  res.render('profile', {
    title: 'Trang cá nhân',
    user: req.session.user, // Truyền thông tin người dùng vào view
    classes: req.session.classes // Nếu bạn muốn hiển thị thông tin lớp học
  });
});


app.post('/submit-attendance', async (req, res) => {
  try {
    console.log(req.body); // Kiểm tra dữ liệu nhận từ request
    const { iduser, idclass } = req.body;

    // Kiểm tra dữ liệu đầy đủ hay không
    if (!iduser || !idclass) {
      return res.status(400).json({ success: false, error: 'Thiếu dữ liệu cần thiết' });
    }

    // Lấy giá trị day lớn nhất từ bảng attendances
    const { data: maxDayData, error: maxDayError } = await supabase
      .from('attendances')
      .select('day')
      .eq('iduser', iduser)
      .eq('idclass', idclass)
      .order('day', { ascending: false })
      .limit(1)
      .single();

    if (maxDayError && maxDayError.code !== 'PGRST116') {
      console.error('Error retrieving max day:', maxDayError);
      return res.status(500).json({ success: false, error: 'Lỗi kiểm tra điểm danh' });
    }

    // Xác định giá trị day mới: Nếu chưa có bản ghi nào, day = 1
    const newDay = maxDayData ? parseInt(maxDayData.day) + 1 : 1;

    // Lấy ngày hiện tại và định dạng lại cho so sánh
// Lấy ngày hiện tại và định dạng lại cho so sánh
const formattedToday = moment().tz('Asia/Ho_Chi_Minh').format('YYYY-MM-DD HH:mm:ss'); // Định dạng YYYY-MM-DD HH:mm:ss, múi giờ Việt Nam

// Kiểm tra xem buổi đã được điểm danh chưa
const { data: checkData, error: checkError } = await supabase.rpc('check_attendance', {
  p_iduser: iduser,      // Đảm bảo rằng tên biến khớp với tên hàm
  p_idclass: idclass,
  check_date: formattedToday
});

    if (checkError) {
      console.error('Error checking attendance:', checkError);
      return res.status(500).json({ success: false, error: 'Lỗi kiểm tra điểm danh' });
    }

    if (checkData) {
      return res.status(400).json({ success: false, error: 'Hôm nay đã điểm danh.' });
    }

    // Thêm bản ghi điểm danh mới
    const { data: attendanceData, error: attendanceError } = await supabase
      .from('attendances')
      .insert([{
        iduser,
        idclass,
        day: newDay,
        check_status: true,
        time: new Date().toLocaleString() // Xử lý thời gian trên server
      }]);

    if (attendanceError) {
      console.error('Error adding attendance:', attendanceError);
      return res.status(500).json({ success: false, error: 'Lỗi thêm bản ghi điểm danh' });
    }

    // Lấy email và tên sinh viên từ bảng users
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('email, fullname')
      .eq('iduser', iduser)
      .single();

    if (userError) {
      console.error('Error retrieving user email:', userError);
      return res.status(500).json({ success: false, error: 'Lỗi lấy địa chỉ email của sinh viên' });
    }

    // Lấy tên lớp từ bảng classes
    const { data: classData, error: classError } = await supabase
      .from('classes')
      .select('nameclass')
      .eq('idclass', idclass)
      .limit(1) // Giới hạn kết quả về 1 hàng
      .single();

    if (classError) {
      console.error('Error retrieving class data:', classError);
      return res.status(500).json({ success: false, error: 'Lỗi lấy tên lớp học' });
    }

    // Lấy thời gian hiện tại
    const currentDate = new Date();

    // Lấy giá trị ngày, tháng, năm từ currentDate
    const day = currentDate.getDate();
    const month = currentDate.getMonth() + 1; // Tháng trong JavaScript bắt đầu từ 0, nên cần +1
    const year = currentDate.getFullYear();

    // Gửi email thông báo
    const mailOptions = {
      from: 'minhph313@gmail.com',
      to: userData.email,
      subject: `Xác nhận điểm danh thành công - Ngày ${day} Tháng ${month} Năm ${year}`,
      html: `<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Xác nhận điểm danh thành công</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; margin: 0; padding: 0; background-color: #f4f4f4; font-size: 16px;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 700px; margin: 0 auto;">
        <tr>
            <td style="padding: 30px 0; text-align: center; background-color: #003366;">
                <h1 style="color: #ffffff; margin: 0; font-size: 28px;">Xác nhận điểm danh thành công</h1>
            </td>
        </tr>
        <tr>
            <td style="padding: 30px 20px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                    <tr>
                        <td style="padding: 30px;">
                            <p style="margin-top: 0; font-size: 18px;">Chào <span style="font-weight: bold; color: #003366;">${userData.fullname}</span>,</p>
                            <p style="font-size: 18px;">Bạn đã điểm danh thành công cho:</p>
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="15" border="0" style="margin: 20px 0; background-color: #f9f9f9; border-radius: 8px;">
                                <tr>
                                    <td width="30%" style="font-weight: bold; font-size: 18px;">Lớp:</td>
                                    <td style="color: #003366; font-size: 18px;">${classData.nameclass} - ${idclass}</td>
                                </tr>
                                <tr>
                                    <td width="30%" style="font-weight: bold; font-size: 18px;">Thời gian:</td>
                                    <td style="color: #003366; font-size: 18px;">Ngày ${day} tháng ${month} năm ${year}</td>
                                </tr>
                            </table>
                            <p style="font-size: 18px;">Cảm ơn bạn đã tham gia!</p>
                            <p style="margin-bottom: 0; font-size: 18px;">Trân trọng,<br><strong>Cuong Manh Nguyen</strong></p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
        <tr>
            <td style="padding: 20px; text-align: center; font-size: 14px; color: #666666;">
                <p>&copy; 2024 - Hệ thống điểm danh online bởi Cường Nguyễn.</p>
            </td>
        </tr>
    </table>
</body>
</html>`,
    };

    // Gửi email và kiểm tra lỗi
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error('Error sending email:', error);
        return res.status(500).json({ success: false, error: 'Lỗi gửi email' });
      }

      console.log('Email sent:', info.response);
      return res.status(200).json({ success: true, message: 'Điểm danh thành công và đã gửi email xác nhận.' });
    });

  } catch (err) {
    console.error('Unexpected error:', err);
    return res.status(500).json({ success: false, error: 'Lỗi không xác định xảy ra' });
  }
});



app.get('/attendanceHistory', isAuthenticated, async (req, res) => {
  const userId = req.session.user?.iduser; // Thêm '?' để tránh lỗi khi user không tồn tại

  try {
    // Truy vấn lấy thông tin các lớp học của sinh viên
    const { data, error } = await supabase
      .from('classes')
      .select(`idclass, nameclass`)
      .eq('iduser', userId);

    if (error) throw error;

    // Kiểm tra nếu req.session.user tồn tại
    if (!req.session.user) {
      return res.status(400).send("User session not found");
    }

    // Render trang attendanceHistory với dữ liệu lớp học và user
    res.render('attendanceHistory', {
      classes: data,
      user: req.session.user // Truyền user từ session
    });

  } catch (error) {
    console.error('Error fetching attendance history:', error);
    res.status(500).send('Internal Server Error');
  }
});

// Cấu hình nơi lưu trữ file tải lên
// Hàm loại bỏ dấu tiếng Việt
function removeVietnameseTones(str) {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');
}

// Cấu hình Multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const { namedoc, idclass } = req.body; // Lấy tên tài liệu và idclass từ request body
    const finalNamedoc = removeVietnameseTones(namedoc || 'default'); // Loại bỏ dấu tiếng Việt
    const finalIdClass = removeVietnameseTones(idclass || 'default'); // Loại bỏ dấu tiếng Việt

    // Tạo tên thư mục kết hợp
    const uploadDir = path.join(__dirname, 'uploads', `${finalNamedoc}_${finalIdClass}`); 
    
    // Kiểm tra nếu thư mục không tồn tại, tạo thư mục
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true }); // Tạo thư mục nếu chưa tồn tại
    }

    cb(null, uploadDir); // Chỉ định thư mục lưu file
  },
  filename: function (req, file, cb) {
    const extension = path.extname(file.originalname); // Lấy phần mở rộng của file
    let fileName = path.basename(file.originalname, extension); // Lấy tên file không bao gồm phần mở rộng
    fileName = removeVietnameseTones(fileName); // Loại bỏ dấu tiếng Việt
    cb(null, fileName + extension); // Trả về tên file với phần mở rộng ban đầu
  }
});
// Khởi tạo Multer với cấu hình lưu trữ
const upload = multer({ storage: storage });


app.post('/api/upload-document', upload.array('file'), async (req, res) => {
  const { idclass, nameclass, namedoc, newNamedoc } = req.body;
  const files = req.files; // Lưu trữ tất cả file được tải lên

  // Kiểm tra nếu người dùng nhập tên thư mục mới
  const finalNamedoc = (newNamedoc && newNamedoc.trim() !== "") ? newNamedoc : namedoc;

  if (files.length === 0) {
    return res.status(400).json({ success: false, message: 'Vui lòng chọn file để tải lên.' });
  }

  // Kiểm tra định dạng file
  const allowedExtensions = ['.pdf', '.docx', '.pptx', '.jpg', '.jpeg', '.png', '.gif', '.mp3'];
  for (let file of files) {
    const fileExtension = path.extname(file.originalname).toLowerCase();
    if (!allowedExtensions.includes(fileExtension)) {
      return res.status(400).json({ success: false, message: 'Định dạng file không hợp lệ. Vui lòng chọn file PDF, DOCX, PPTX, hình ảnh (JPG, JPEG, PNG, GIF), hoặc MP3.' });
    }
  }

  try {
    for (let file of files) {
      // Tạo tên tài liệu theo định dạng namedoc_idclass
      const finalNamedocIdClass = `${finalNamedoc}_${idclass}`;
      // Đường dẫn đến tài liệu trong thư mục uploads
      const urlmaterial = path.posix.join(finalNamedocIdClass, file.filename); // Tạo url theo dạng namedoc_idclass

      // Kiểm tra xem tài liệu đã tồn tại trong cơ sở dữ liệu hay chưa
      const { data: existingFile, error: fetchError } = await supabase
        .from('material')
        .select('namematerial')
        .eq('namedoc', finalNamedocIdClass) // Sử dụng tên mới
        .eq('namematerial', file.originalname)
        .eq('idclass', idclass);

      if (fetchError) {
        return res.status(500).json({ success: false, message: 'Có lỗi khi kiểm tra tài liệu: ' + fetchError.message });
      }

      // Nếu tài liệu đã tồn tại, bỏ qua việc thêm mới
      if (existingFile.length > 0) {
        console.log(`File "${file.originalname}" đã tồn tại, không cần cập nhật vào cơ sở dữ liệu.`);
      } else {
        // Thêm tài liệu mới vào cơ sở dữ liệu nếu chưa tồn tại
        const { error } = await supabase
          .from('material')
          .insert({
            idclass: idclass,
            nameclass: nameclass,
            namedoc: finalNamedocIdClass, // Lưu tên tài liệu theo định dạng mới
            namematerial: file.originalname,
            urlmaterial: urlmaterial,
          });

        if (error) {
          return res.status(500).json({ success: false, message: 'Có lỗi xảy ra khi lưu tài liệu: ' + error.message });
        }
      }
    }

    return res.status(200).json({ success: true, message: 'Tài liệu đã được tải lên thành công!' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Đã xảy ra lỗi: ' + err.message });
  }
});


// Route để xem tài liệu
app.get('/admin/seeMaterial', isAuthenticated, async (req, res) => {
  try {
    const { data: materials, error } = await supabase
      .from('material') // Sửa lại tên bảng ở đây
      .select('namedoc'); // Giả sử namedoc là tên thư mục

    if (error) throw error;

    // Kiểm tra xem materials có dữ liệu không
    if (!materials || materials.length === 0) {
      return res.render('admin/seeMaterial', { groupedMaterials: {} });
    }

    // Nhóm tài liệu theo namedoc để lấy tổng số tài liệu
    const groupedMaterials = materials.reduce((acc, material) => {
      acc[material.namedoc] = (acc[material.namedoc] || 0) + 1;
      return acc;
    }, {});

    res.render('admin/seeMaterial', { groupedMaterials });
  } catch (err) {
    console.error(err);
    res.status(500).send('Lỗi khi lấy dữ liệu');
  }
});
// Định nghĩa hàm lấy tài liệu theo namedoc
async function getMaterialsByNamedoc(namedoc) {
  const { data: materials, error } = await supabase
    .from('material') // Đảm bảo bạn đang gọi đúng bảng 'material'
    .select('*')
    .eq('namedoc', namedoc); // Giả sử namedoc là cột trong bảng material

  if (error) {
    throw error;
  }
  return materials; // Trả về danh sách tài liệu
}
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// app.js hoặc routes của bạn
// Route để lấy tài liệu khi nhấn nút
// Route để lấy tài liệu theo namedoc
app.post('/get-materials', async (req, res) => {
  const { namedoc } = req.body;
  console.log("Fetching materials for namedoc:", namedoc); // Log tên thư mục

  try {
    const materials = await getMaterialsByNamedoc(namedoc); // Hàm này cần phải định nghĩa
    res.json(materials);
  } catch (error) {
    console.error('Error fetching materials:', error);
    res.status(500).json({ error: 'Có lỗi xảy ra khi lấy tài liệu.' });
  }
});

// Hàm để xóa thư mục và tất cả các file bên trong
function deleteFolderRecursive(directoryPath) {
  if (fs.existsSync(directoryPath)) {
    fs.readdirSync(directoryPath).forEach((file) => {
      const currentPath = path.join(directoryPath, file);
      if (fs.lstatSync(currentPath).isDirectory()) {
        // Nếu là thư mục, tiếp tục xóa đệ quy
        deleteFolderRecursive(currentPath);
      } else {
        // Nếu là file, xóa file
        fs.unlinkSync(currentPath);
      }
    });
    fs.rmdirSync(directoryPath); // Xóa thư mục rỗng
  }
}

app.delete('/delete-materials', async (req, res) => {
  const { namedoc } = req.body;

  try {
    // Xóa tất cả các dòng có namedoc trong bảng material
    const { data, error } = await supabase
      .from('material')
      .delete()
      .eq('namedoc', namedoc);

    if (error) throw error;

    // Đường dẫn đến thư mục uploads/namedoc
    const directoryPath = path.join(__dirname, 'uploads', namedoc);

    // Kiểm tra và xóa thư mục
    deleteFolderRecursive(directoryPath);

    res.status(200).json({ message: 'Tài liệu và thư mục đã được xóa thành công.' });
  } catch (error) {
    console.error('Error deleting materials:', error);
    res.status(500).json({ message: 'Có lỗi xảy ra khi xóa tài liệu và thư mục.' });
  }
});

app.delete('/delete-selected-materials', async (req, res) => {
  const { namedoc, selectedMaterials } = req.body;

  try {
    // Xóa các tài liệu trong cơ sở dữ liệu
    const { error: deleteError } = await supabase
      .from('material')
      .delete()
      .eq('namedoc', namedoc)
      .in('namematerial', selectedMaterials);

    if (deleteError) throw deleteError;

    res.status(200).json({ message: 'Đã xóa tài liệu thành công.' });
  } catch (error) {
    console.error('Error deleting materials:', error);
    res.status(500).json({ message: 'Có lỗi xảy ra khi xóa tài liệu: ' + error.message });
  }
});

//sinh vien
app.get('/material', async (req, res) => {
  const iduser = req.session.user?.iduser; // Lấy iduser từ session

  try {
    // Truy vấn để tìm tất cả các lớp mà sinh viên tham gia
    const { data: classes, error: classError } = await supabase
      .from('classes')
      .select('idclass, nameclass')
      .eq('iduser', iduser);

    if (classError) throw classError;

    // Lưu trữ các idclass
    const classIds = classes.map(classItem => classItem.idclass);

    // Truy vấn để tìm tất cả các tài liệu cho các idclass đó
    const { data: materials, error: materialError } = await supabase
      .from('material')
      .select('namedoc, idclass')
      .in('idclass', classIds);

    if (materialError) throw materialError;

    // Tạo đối tượng chứa tài liệu theo namedoc
    const groupedMaterials = {};
    materials.forEach(material => {
      const { namedoc, idclass } = material;

      // Nếu namedoc chưa tồn tại trong groupedMaterials, khởi tạo
      if (!groupedMaterials[namedoc]) {
        groupedMaterials[namedoc] = {
          idclass: idclass,
          count: 0
        };
      }
      // Tăng số lượng tài liệu
      groupedMaterials[namedoc].count++;
    });

    // Chuyển đổi groupedMaterials thành mảng để dễ dàng render
    const materialsArray = Object.keys(groupedMaterials).map(namedoc => ({
      namedoc,
      count: groupedMaterials[namedoc].count,
      idclass: groupedMaterials[namedoc].idclass // có thể thêm vào nếu cần
    }));

    // Render trang students/studentMaterial.ejs với dữ liệu đã lấy
    res.render('students/studentMaterial', { materialsArray });
  } catch (error) {
    console.error('Error fetching materials:', error);
    res.status(500).send('Có lỗi xảy ra khi lấy tài liệu.');
  }
});

// Route để hiển thị trang nhập điểm
// Route lấy thông tin và điểm sinh viên
app.get('/students/score/:iduser/:idclass', async (req, res) => {
  const { idclass, iduser } = req.params;

  try {
    // Lấy tất cả điểm từ cơ sở dữ liệu cho sinh viên
    const { data: existingScores, error: scoreError } = await supabase
      .from('score')
      .select('score1, score2, score3, mid_score, final_score, gpa_score')
      .eq('iduser', iduser)
      .eq('idclass', idclass);

    // Kiểm tra lỗi khi lấy điểm
    if (scoreError) {
      console.error('Error fetching scores:', scoreError);
      return res.status(500).send('Có lỗi xảy ra khi lấy điểm.');
    }

    //console.log('Existing Scores:', existingScores); // In ra dữ liệu lấy từ cơ sở dữ liệu

    // Chuyển đổi existingScores thành một object để dễ sử dụng
    const scoresMap = {
      score1: null,
      score2: null,
      score3: null,
      mid_score: null,
      final_score: null,
      gpa_score: null,
    };

    if (existingScores && Array.isArray(existingScores) && existingScores.length > 0) {
      existingScores.forEach(score => {
        //console.log('Current Score:', score); // In ra từng score
        scoresMap['score1'] = score.score1 !== undefined ? score.score1 : null;
        scoresMap['score2'] = score.score2 !== undefined ? score.score2 : null;
        scoresMap['score3'] = score.score3 !== undefined ? score.score3 : null;
        scoresMap['mid_score'] = score.mid_score !== undefined ? score.mid_score : null;
        scoresMap['final_score'] = score.final_score !== undefined ? score.final_score : null;
        scoresMap['gpa_score'] = score.gpa_score !== undefined ? score.gpa_score : null;
      });
    }

    // In ra scoresMap
    //console.log('Scores Map:', scoresMap);    
    // Lấy tên sinh viên từ cơ sở dữ liệu
    const { data: studentData, error: studentError } = await supabase
      .from('users')
      .select('fullname')
      .eq('iduser', iduser);

    // Kiểm tra lỗi khi lấy tên sinh viên
    if (studentError) {
      console.error('Error fetching student name:', studentError);
      return res.status(500).send(`Có lỗi xảy ra khi lấy tên sinh viên: ${studentError.message}`);
    }

    // Kiểm tra xem sinh viên có tồn tại hay không
    if (studentData.length === 0) {
      return res.status(404).send(`Không tìm thấy sinh viên với ID user: ${iduser}`);
    }

    // Lấy tên sinh viên từ dữ liệu trả về
    const studentName = studentData[0].fullname || 'Tên Sinh Viên';

    // Render trang nhập điểm
    res.render('score', {
      idclass,
      iduser,
      studentName, // Sử dụng tên sinh viên
      existingScores: scoresMap, // Truyền object chứa điểm đã tồn tại
    });
  } catch (error) {
    console.error('Error fetching scores:', error);
    res.status(500).send('Có lỗi xảy ra.');
  }

});
// Route xử lý lưu điểm cho từng cột
app.post('/admin/score/save', async (req, res) => {
  const { iduser, idclass, field, value } = req.body;

  try {
    // Kiểm tra nếu bản ghi đã tồn tại
    const { data: existingScore, error: fetchError } = await supabase
      .from('score')
      .select()
      .eq('iduser', iduser)
      .eq('idclass', idclass)
      .single();

    // Nếu có lỗi khác ngoài không tìm thấy bản ghi
    if (fetchError && fetchError.code !== 'PGRST116') {
      throw fetchError;
    }

    // Cập nhật điểm theo cột
    let result;
    if (existingScore) {
      // Cập nhật điểm cho cột cụ thể
      result = await supabase
        .from('score')
        .update({ [field]: parseFloat(value) })
        .eq('iduser', iduser)
        .eq('idclass', idclass);
    } else {
      // Nếu chưa có, tạo bản ghi mới
      const newScore = { iduser, idclass, [field]: parseFloat(value) };
      result = await supabase
        .from('score')
        .insert(newScore);
    }

    // Kiểm tra xem có lỗi khi cập nhật hoặc chèn không
    if (result.error) {
      console.error('Error during insert/update:', result.error);
      throw result.error;
    }

    // Phản hồi thành công
    res.json({ success: true, message: `Điểm ${field} đã được lưu.` });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ success: false, message: 'Có lỗi xảy ra khi lưu điểm.' });
  }
});


//sinh vien
app.get('/studentScore', async (req, res) => {
  const iduser = req.session.user?.iduser; // Lấy iduser từ session
  console.log('ID người dùng (iduser) từ session:', iduser); // Kiểm tra giá trị iduser
  // Kiểm tra xem người dùng đã đăng nhập chưa
  if (!req.session.user) {
    return res.redirect('/login');
  }

  try {
    // Lấy dữ liệu điểm số từ cơ sở dữ liệu cho iduser
    const { data: scores, error: scoreError } = await supabase
      .from('score')
      .select('idclass, score1, score2, score3, mid_score, final_score, gpa_score')
      .eq('iduser', iduser); // Lấy điểm theo iduser

    if (scoreError) throw scoreError;

    // Nếu không có điểm, trả về trang với thông báo
    if (!scores || scores.length === 0) {
      return res.render('studentScore', { scores: [] });
    }

    // Lấy tên lớp cho từng idclass
    const classIds = scores.map(score => score.idclass);
    const { data: classes, error: classError } = await supabase
      .from('classes')
      .select('idclass, nameclass')
      .in('idclass', classIds);

    if (classError) throw classError;

    // Tạo một đối tượng để dễ dàng tra cứu tên lớp
    const classMap = {};
    classes.forEach(cls => {
      classMap[cls.idclass] = cls.nameclass;
    });

    // Gán tên lớp cho từng score
    scores.forEach(score => {
      score.className = classMap[score.idclass] || 'Không có tên lớp';
    });

    // Lấy fullname từ bảng users dựa trên iduser
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('fullname')
      .eq('iduser', iduser)
      .single(); // Chỉ lấy một bản ghi

    console.log('Tên người dùng (fullname) từ cơ sở dữ liệu:', user?.fullname); // Kiểm tra fullname

    if (userError) throw userError;
    const fullname = user?.fullname || 'Không có tên người dùng';

    // Render trang studentScore.ejs với dữ liệu điểm số
    res.render('studentScore', {
      scores,
      fullname, // Truyền fullname vào
      iduser  // Truyền iduser vào
    });
  } catch (error) {
    console.error('Error fetching scores:', error);
    res.status(500).send('Internal Server Error');
  }
});


// Endpoint lấy danh sách sinh viên
app.get('/api/users', async (req, res) => {
  try {
    const { data: users, error } = await supabase
      .from('users')
      .select('iduser, fullname');

    if (error) throw error;

    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Endpoint lấy danh sách lớp học của một sinh viên
app.get('/api/classes/:iduser', async (req, res) => {
  const { iduser } = req.params;
  try {
    const { data: classes, error } = await supabase
      .from('classes')
      .select('idclass, nameclass')
      .eq('iduser', iduser); // Giả định bạn có trường iduser trong bảng classes

    if (error) throw error;

    res.json(classes);
  } catch (error) {
    console.error('Error fetching classes:', error);
    res.status(500).json({ error: 'Failed to fetch classes' });
  }
});


// quan ly diem admin
app.get('/scoreManage', isAuthenticated, async (req, res) => {
  const iduser = req.query.iduser;

  // Kiểm tra xem có iduser không
  if (!iduser) {
    return res.status(400).send('ID sinh viên không được cung cấp');
  }

  try {
    // Lấy thông tin điểm số từ cơ sở dữ liệu cho iduser
    const { data: scores, error: scoreError } = await supabase
      .from('score')
      .select('idclass, score1, score2, score3, mid_score, final_score, gpa_score')
      .eq('iduser', iduser);

    if (scoreError) {
      console.error('Lỗi khi lấy thông tin điểm:', scoreError);
      return res.status(500).send('Lỗi khi lấy thông tin điểm.');
    }

    // Kiểm tra nếu không có điểm
    if (!scores || scores.length === 0) {
      return res.render('scoreManage', {
        scores: [],
        iduser,
        fullname: 'Không có tên người dùng'
      });
    }

    // Lấy tên lớp cho từng idclass
    const classIds = scores.map(score => score.idclass);
    const { data: classes, error: classError } = await supabase
      .from('classes')
      .select('idclass, nameclass')
      .in('idclass', classIds);

    if (classError) {
      console.error('Lỗi khi lấy tên lớp:', classError);
      return res.status(500).send('Lỗi khi lấy tên lớp.');
    }

    // Tạo một đối tượng để dễ dàng tra cứu tên lớp
    const classMap = {};
    classes.forEach(cls => {
      classMap[cls.idclass] = cls.nameclass;
    });

    // Gán tên lớp cho từng score
    scores.forEach(score => {
      score.className = classMap[score.idclass] || 'Không có tên lớp';
      score.score1 = score.score1 !== null ? score.score1 : '';
      score.score2 = score.score2 !== null ? score.score2 : '';
      score.score3 = score.score3 !== null ? score.score3 : '';
      score.mid_score = score.mid_score !== null ? score.mid_score : '';
      score.final_score = score.final_score !== null ? score.final_score : '';
      score.gpa_score = score.gpa_score !== null ? score.gpa_score : '';
    });

    // Lấy fullname của sinh viên từ bảng users
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('fullname')
      .eq('iduser', iduser)
      .single(); // Chỉ lấy một bản ghi

    if (userError) {
      console.error('Lỗi khi lấy fullname:', userError);
      return res.status(500).send('Lỗi khi lấy tên sinh viên.');
    }

    // Render trang scoreManage.ejs với thông tin cần thiết
    res.render('scoreManage', {
      scores,
      iduser,
      fullname: user?.fullname || 'Không có tên người dùng' // Lấy fullname của sinh viên
    });
  } catch (error) {
    console.error('Lỗi không xác định:', error);
    res.status(500).send('Lỗi nội bộ');
  }
});

//doi mat khau cho sinh vien
app.post('/change-password', async (req, res) => {
  const { currentPassword, newPassword, iduser } = req.body;

  try {
    // Lấy thông tin người dùng từ Supabase
    const { data: user, error: fetchError } = await supabase
      .from('users')
      .select('password')
      .eq('iduser', iduser)
      .single();

    if (fetchError) {
      return res.status(404).json({ success: false, message: 'Người dùng không tồn tại' });
    }

    // Kiểm tra mật khẩu hiện tại
    if (currentPassword !== user.password) {
      return res.status(400).json({ success: false, message: 'Mật khẩu hiện tại không đúng' });
    }

    // Cập nhật mật khẩu mới trong Supabase
    const { error: updateError } = await supabase
      .from('users')
      .update({ password: newPassword })
      .eq('iduser', iduser);

    if (updateError) {
      throw updateError;
    }

    res.json({ success: true, message: 'Đổi mật khẩu thành công' });
  } catch (error) {
    console.error('Lỗi khi đổi mật khẩu:', error);
    res.status(500).json({ success: false, message: 'Đã xảy ra lỗi khi đổi mật khẩu' });
  }
});

app.post('/update-attendance-status/:idclass', async (req, res) => {
  const idclass = req.params.idclass;
  const status = req.body.status;

  console.log(`Updating attendance status for class ${idclass} to ${status}`); // Debug

  try {
    // Cập nhật cơ sở dữ liệu
    const { data, error } = await supabase
      .from('status_class')
      .upsert({ idclass: idclass, status: status }); // Cập nhật trạng thái mới

    if (error) throw error;

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Cập nhật thất bại' });
  }
});

app.get('/check-status/:idclass', async (req, res) => {
  const { idclass } = req.params;
  try {
    const { data: statusData, error } = await supabase
      .from('status_class')
      .select('status')
      .eq('idclass', idclass)
      .single();

    if (error) throw error;

    res.json({
      success: true,
      status: statusData ? statusData.status : false // Giả định false nếu không có dữ liệu
    });
  } catch (error) {
    console.error('Error fetching class status:', error);
    res.status(500).send('Có lỗi xảy ra khi lấy trạng thái.');
  }
});




//thong bao // danh cho admin
app.post('/api/create-notification', async (req, res) => {
  const { idclass, content } = req.body;

  try {
    const { data, error } = await supabase
      .from('information')
      .insert([
        { idclass, content, createdat: new Date() }
      ]);

    if (error) throw error;

    res.json({ success: true, message: 'Thông báo đã được tạo thành công' });
  } catch (error) {
    console.error('Error creating notification:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Endpoint để lấy danh sách lớp duy nhất
app.get('/api/unique-classes', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('classes')
      .select('idclass, nameclass')
      .order('idclass', { ascending: true });

    if (error) throw error;

    // Lọc để chỉ lấy các bản ghi duy nhất
    const uniqueClasses = data.filter((class1, index, self) =>
      index === self.findIndex((class2) => class2.idclass === class1.idclass)
    );

    res.json(uniqueClasses);
  } catch (error) {
    console.error('Error fetching unique classes:', error);
    res.status(500).json({ error: error.message });
  }
});
// API để lấy thông tin lớp theo idclass
app.get('/api/unique-classes/:idclass', async (req, res) => {
  try {
    const { idclass } = req.params;

    const { data, error } = await supabase
      .from('classes')
      .select('nameclass')
      .eq('idclass', idclass)
      .single(); // Lấy một bản ghi duy nhất

    if (error) throw error;

    res.json(data);
  } catch (error) {
    console.error('Error fetching class info:', error);
    res.status(500).json({ error: error.message });
  }
});


// thong bao danh cho sinh vien
// Thêm route sau vào file server của bạn (ví dụ: app.js hoặc server.js)
// Endpoint để lấy tất cả thông báo của sinh viên theo iduser

// Endpoint để lấy chi tiết thông báo
app.get('/api/notifications/all', isAuthenticated, async (req, res) => {
  const userId = req.session.user.iduser; // Lấy userId từ session


  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized: userId not found' });
  }

  try {
    // Bước 1: Lấy danh sách idclass của userId từ bảng classes
    const { data: classes, error: classError } = await supabase
      .from('classes')
      .select('idclass')
      .eq('iduser', userId); // Kiểm tra đúng cột `iduser` hay không

    if (classError) {
      console.error('Error fetching classes:', classError);
      return res.status(500).json({ error: classError.message });
    }

    // Chuyển đổi classes thành mảng idclass
    const classIds = classes.map(c => c.idclass);

    // Nếu không có idclass nào thì trả về mảng rỗng
    if (classIds.length === 0) {
      return res.json({ notifications: [] });
    }

    // Bước 2: Truy vấn thông báo theo danh sách idclass
    const { data: notifications, error: notificationError } = await supabase
      .from('information')
      .select('*')
      .in('idclass', classIds)
      .order('createdat', { ascending: false })
      .limit(50); // Lấy 10 thông báo gần nhất

    if (notificationError) {
      console.error('Error fetching notifications:', notificationError);
      return res.status(500).json({ error: notificationError.message });
    }

    // Trả về danh sách thông báo
    res.json({ notifications });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/evaluationform/:iduser', isAuthenticated, async (req, res) => {
  const iduser = req.params.iduser; // Lấy iduser từ URL

  const { data, error } = await supabase
    .from('evaluations')
    .select('created_at')
    .eq('iduser', iduser)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  let message = '';
  let nextEvaluationDate = null;

  if (data) {
    const lastEvaluationDate = new Date(data.created_at); // Ngày đánh giá cuối cùng
    const currentDate = new Date();
    const diffTime = Math.abs(currentDate - lastEvaluationDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); // Chuyển đổi thành ngày

    if (diffDays < 29) {
      const remainingDays = 29 - diffDays;
      message = `Bạn đã đánh giá gần đây. Lần đánh giá tiếp theo còn ${remainingDays} ngày nữa.`;

      // Tính toán ngày đánh giá tiếp theo
      nextEvaluationDate = new Date(lastEvaluationDate);
      nextEvaluationDate.setDate(lastEvaluationDate.getDate() + 29); // Ngày đánh giá tiếp theo
    } else {
      // Nếu đã qua 31 ngày, cho phép đánh giá ngay lập tức
      nextEvaluationDate = new Date(); // Đặt ngay bây giờ, có thể đánh giá ngay
    }
  } else {
    // Nếu không có đánh giá nào, cho phép đánh giá ngay lập tức
    nextEvaluationDate = new Date(); // Đặt ngay bây giờ, có thể đánh giá ngay
  }

  // Tính toán thời gian còn lại cho lần đánh giá tiếp theo
  const timeRemaining = nextEvaluationDate - new Date(); // Thời gian còn lại tính bằng mili giây
  const remainingSeconds = Math.max(Math.floor(timeRemaining / 1000), 0); // Đảm bảo không âm
  const days = Math.floor(remainingSeconds / (3600 * 24));
  const hours = Math.floor((remainingSeconds % (3600 * 24)) / 3600);
  const minutes = Math.floor((remainingSeconds % 3600) / 60);
  const seconds = remainingSeconds % 60;

  if (timeRemaining > 0) {
    message = `Bạn đã đánh giá gần đây. Lần đánh giá tiếp theo còn ${days} ngày ${hours} giờ ${minutes} phút ${seconds} giây nữa.`;
  } else {
    message = "Bạn có thể đánh giá ngay bây giờ!";
  }

  res.render('evaluationform', { iduser, message, nextEvaluationDate }); // Gửi iduser, message và nextEvaluationDate đến trang evaluationform
});

const moment = require('moment-timezone');

app.post('/submit-evaluation', async (req, res) => {
  const {
    iduser, content, method, interaction, feedback, duration,
    material, catchField, support, speak, motivation,
    tech, fair, attitude, refer, style, prep, situation, flexible, relationship, connect
  } = req.body;

  try {
    // Kiểm tra xem tất cả các trường cần thiết đã được điền đầy đủ
    const requiredFields = [
      'iduser', 'content', 'method', 'interaction', 'feedback', 'duration',
      'material', 'catchField', 'support', 'speak', 'motivation',
      'tech', 'fair', 'attitude', 'refer', 'style', 'prep', 'situation', 'flexible', 'relationship', 'connect'
    ];

    const missingFields = requiredFields.filter(field => !req.body[field]);

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Các trường sau chưa được điền: ${missingFields.join(', ')}`
      });
    }

    // Chuyển đổi các giá trị thành số
    const numericFields = [
      'content', 'method', 'interaction', 'feedback', 'duration',
      'material', 'catchField', 'support', 'speak', 'motivation',
      'tech', 'fair', 'attitude', 'refer', 'style', 'prep', 'situation', 'flexible', 'relationship', 'connect'
    ];

    const evaluationData = {
      iduser,
      created_at: new Date().toLocaleString(), // Lưu trữ timestamp hiện tại
      ...numericFields.reduce((acc, field) => {
        acc[field] = parseInt(req.body[field], 10);
        return acc;
      }, {})
    };
            
    // Lưu đánh giá vào cơ sở dữ liệu
    const { data: evalData, error: evalError } = await supabase
      .from('evaluations')
      .insert([evaluationData]);

    if (evalError) throw evalError;

        // Lấy thời gian đánh giá
        const createdAt = new Date().toLocaleString(); // Hoặc bạn có thể lấy từ data nếu nó trả về


    // Lấy email của sinh viên từ bảng users
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('email')
      .eq('iduser', iduser)
      .single(); // Lấy một bản ghi duy nhất

    if (userError || !userData) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy thông tin người dùng.'
      });
    }

    const studentEmail = userData.email;

    // Tạo nội dung email
    const emailContent = `
      <h1>Thông tin đánh giá</h1>
      <p>ID sinh viên: ${iduser}</p>
      <p>Nội dung giảng dạy: ${content}</p>
      <p>Phương pháp giảng dạy: ${method}</p>
      <p>Tương tác với sinh viên: ${interaction}</p>
      <p>Đánh giá và phản hồi: ${feedback}</p>
      <p>Thời lượng học: ${duration}</p>
      <p>Sử dụng tài liệu học: ${material}</p>
      <p>Sự tiếp cận của bài học: ${catchField}</p>
      <p>Hỗ trợ ngoài giờ học: ${support}</p>
      <p>Khả năng truyền đạt: ${speak}</p>
      <p>Khả năng tạo động lực: ${motivation}</p>
      <p>Công nghệ hỗ trợ giảng dạy: ${tech}</p>
      <p>Sự công bằng trong đánh giá: ${fair}</p>
      <p>Thái độ và phong cách làm việc: ${attitude}</p>
      <p>Hỗ trợ tài liệu tham khảo: ${refer}</p>
      <p>Tác phong và phẩm chất của giảng viên: ${style}</p>
      <p>Sự chuẩn bị bài giảng: ${prep}</p>
      <p>Khả năng xử lý tình huống: ${situation}</p>
      <p>Độ linh hoạt trong giảng dạy: ${flexible}</p>
      <p>Mối quan hệ với sinh viên: ${relationship}</p>
      <p>Khả năng kết nối giữa lý thuyết và thực tiễn: ${connect}</p>
            <p>Thời gian ghi nhận đánh giá: ${evaluationData.created_at}</p>

    `;

    // Gửi email
    await transporter.sendMail({
      from: 'minhph313@gmail.com',
      to: studentEmail,
      subject: 'Thông tin đánh giá',
      html: `
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Đánh giá Giảng viên</title>
    <!--[if mso]>
    <noscript>
    <xml>
    <o:OfficeDocumentSettings>
    <o:PixelsPerInch>96</o:PixelsPerInch>
    </o:OfficeDocumentSettings>
    </xml>
    </noscript>
    <![endif]-->
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap');
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: 'Roboto', Arial, sans-serif;
            line-height: 1.6;
            color: #333333;
            background-color: #f4f4f4;
        }
        .container {
            max-width: 800px;
            margin: 0 auto;
            background-color: #ffffff;
            box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
        }
        .header {
            background-color: #4a90e2;
            color: #ffffff;
            padding: 20px;
            text-align: center;
        }
        h1 {
            font-size: 24px;
            font-weight: 700;
            margin-bottom: 10px;
        }
        .content {
            padding: 20px;
        }
        .evaluation-table {
            width: 100%;
            border-collapse: separate;
            border-spacing: 5px;
        }
        .evaluation-table th {
            background-color: #4a90e2;
            color: #ffffff;
            font-weight: 500;
            text-align: center;
            padding: 10px 5px;
            font-size: 12px;
            border-radius: 5px;
        }
        .evaluation-table td {
            background-color: #f8f8f8;
            padding: 10px 5px;
            text-align: center;
            font-size: 14px;
            border-radius: 5px;
        }
        .evaluation-table tr:nth-child(even) td {
            background-color: #f0f0f0;
        }
        .footer {
            background-color: #333333;
            color: #ffffff;
            text-align: center;
            padding: 15px;
            font-size: 14px;
        }
        .student-id {
            background-color: #ffd700;
            color: #333333;
            font-weight: bold;
            padding: 10px;
            margin-bottom: 10px;
            text-align: center;
            border-radius: 5px;
        }
        .timestamp {
            background-color: #e0e0e0;
            color: #333333;
            padding: 10px;
            margin-bottom: 20px;
            text-align: center;
            border-radius: 5px;
            font-style: italic;
        }
        @media only screen and (max-width: 600px) {
            .container {
                width: 100% !important;
            }
            .evaluation-table {
                font-size: 10px;
            }
            .evaluation-table th, .evaluation-table td {
                padding: 5px 2px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Đánh giá Giảng viên</h1>
            <p>Kết quả đánh giá của bạn</p>
        </div>
        <div class="content">
            <div class="student-id">ID sinh viên: ${iduser}</div>
            <div class="timestamp">Thời gian ghi nhận: ${createdAt}</div>
            <table class="evaluation-table">
                <tr>
                    <th>Nội dung giảng dạy</th>
                    <th>Phương pháp giảng dạy</th>
                    <th>Tương tác với sinh viên</th>
                    <th>Đánh giá và phản hồi</th>
                    <th>Thời lượng học</th>
                </tr>
                <tr>
                    <td>${content}</td>
                    <td>${method}</td>
                    <td>${interaction}</td>
                    <td>${feedback}</td>
                    <td>${duration}</td>
                </tr>
                <tr>
                    <th>Sử dụng tài liệu học</th>
                    <th>Sự tiếp cận của bài học</th>
                    <th>Hỗ trợ ngoài giờ học</th>
                    <th>Khả năng truyền đạt</th>
                    <th>Khả năng tạo động lực</th>
                </tr>
                <tr>
                    <td>${material}</td>
                    <td>${catchField}</td>
                    <td>${support}</td>
                    <td>${speak}</td>
                    <td>${motivation}</td>
                </tr>
                <tr>
                    <th>Công nghệ hỗ trợ giảng dạy</th>
                    <th>Sự công bằng trong đánh giá</th>
                    <th>Thái độ và phong cách làm việc</th>
                    <th>Hỗ trợ tài liệu tham khảo</th>
                    <th>Tác phong và phẩm chất của giảng viên</th>
                </tr>
                <tr>
                    <td>${tech}</td>
                    <td>${fair}</td>
                    <td>${attitude}</td>
                    <td>${refer}</td>
                    <td>${style}</td>
                </tr>
                <tr>
                    <th>Sự chuẩn bị bài giảng</th>
                    <th>Khả năng xử lý tình huống</th>
                    <th>Độ linh hoạt trong giảng dạy</th>
                    <th>Mối quan hệ với sinh viên</th>
                </tr>
                <tr>
                    <td>${prep}</td>
                    <td>${situation}</td>
                    <td>${flexible}</td>
                    <td>${relationship}</td>
                </tr>
            </table>
        </div>
        <div class="footer">
            <p>Cảm ơn bạn đã tham gia đánh giá!</p>
            <p>Trân trọng, Đội ngũ giảng viên - Cường Nguyễn</p>
        </div>
    </div>
</body>
</html>
`
    });
    
    res.json({ success: true, message: 'Đánh giá đã được lưu thành công.' });
  } catch (error) {
    console.error('Error inserting evaluation:', error);
    res.status(500).json({ success: false, message: 'Lỗi khi lưu đánh giá', error: error.message });
  }
});

app.get('/view-evaluation', isAuthenticated, async (req, res) => {
  const { iduser } = req.query; // Lấy iduser từ query params
  try {
    // Lấy tất cả các đánh giá ứng với iduser từ bảng evaluations
    const { data: evaluations, error } = await supabase
      .from('evaluations')
      .select('*')
      .eq('iduser', iduser);

    if (error) {
      return res.status(400).send('Error retrieving evaluations');
    }

        // Lấy thông tin sinh viên từ bảng students
        const { data: student, error: studentError } = await supabase
        .from('users')
        .select('iduser, fullname')
        .eq('iduser', iduser)
        .single(); // Giả sử iduser là id của sinh viên
  
      if (studentError) {
        return res.status(400).send('Error retrieving student information');
      }
  
    // Render trang view-evaluation.ejs và truyền dữ liệu evaluations vào
    res.render('view-evaluation', { evaluations, student, iduser });
  } catch (error) {
    res.status(500).send('Internal Server Error');
  }
});


app.post('/delete-selected-materials', async (req, res) => {
  const { namedoc, selectedDocuments } = req.body;

  // Kiểm tra dữ liệu đầu vào
  if (!namedoc || !Array.isArray(selectedDocuments) || selectedDocuments.length === 0) {
    return res.status(400).json({ error: 'Dữ liệu đầu vào không hợp lệ' });
  }

  try {
    // Đếm số tài liệu có cùng namedoc và thuộc selectedDocuments trước khi xóa
    const { count: initialCount, error: initialCountError } = await supabase
      .from('material')
      .select('*', { count: 'exact', head: true })
      .eq('namedoc', namedoc)
      .in('namematerial', selectedDocuments); // Chỉ đếm những tài liệu trong selectedDocuments

    if (initialCountError) {
      console.error('Lỗi khi đếm tài liệu ban đầu:', initialCountError);
      return res.status(500).json({ error: 'Lỗi khi đếm tài liệu ban đầu' });
    }

    console.log(`Có ${initialCount} tài liệu trong '${namedoc}' để xóa`);

    // Xóa các tài liệu đã chọn
    const { data: deleteData, error: deleteError } = await supabase
      .from('material')
      .delete()
      .eq('namedoc', namedoc)
      .in('namematerial', selectedDocuments); // Xóa những tài liệu trong selectedDocuments

    if (deleteError) {
      console.error('Lỗi khi xóa tài liệu:', deleteError);
      return res.status(500).json({ error: 'Lỗi khi xóa tài liệu từ cơ sở dữ liệu' });
    }

    // Đếm số tài liệu còn lại trong namedoc sau khi xóa
    const { count: remainingCount, error: remainingCountError } = await supabase
      .from('material')
      .select('*', { count: 'exact', head: true })
      .eq('namedoc', namedoc); // Đếm tất cả tài liệu còn lại thuộc namedoc

    if (remainingCountError) {
      console.error('Lỗi khi đếm tài liệu còn lại:', remainingCountError);
      return res.status(500).json({ error: 'Lỗi khi đếm tài liệu còn lại' });
    }

    console.log(`Số tài liệu còn lại trong '${namedoc}': ${remainingCount}`);

    // Tính số tài liệu đã xóa
    const deletedCount = Math.max(0, initialCount - (initialCount - selectedDocuments.length)); // Tính số tài liệu đã xóa bằng selectedDocuments
    console.log(`Đã xóa thành công ${deletedCount} tài liệu từ Supabase`);

    // Nếu không xóa được tài liệu nào, thông báo không có tài liệu nào bị xóa
    const message = deletedCount > 0 ? `Đã xóa thành công ${deletedCount} tài liệu.` : 'Không có tài liệu nào bị xóa.';

    // Trả về kết quả
    res.status(200).json({
      message: message,
      deletedCount: deletedCount,
      remainingCount: remainingCount !== undefined ? remainingCount : 'Không xác định'
    });

  } catch (error) {
    console.error('Lỗi không mong đợi khi xóa tài liệu:', error);
    res.status(500).json({ error: 'Đã xảy ra lỗi không mong đợi' });
  }
});


app.get('/health-survey/:userId', (req, res) => {
  const userId = req.params.userId;
  // Ở đây, bạn có thể thêm logic để lấy thông tin của người dùng nếu cần
  res.render('health-survey', { userId: userId });
});


app.get('/api/student-videos/:iduser', async (req, res) => {
  const { iduser } = req.params;

  try {
    // Lấy thông tin lớp học của sinh viên
    const { data: classes, error: classError } = await supabase
      .from('classes') // Đảm bảo rằng đây là tên bảng đúng
      .select('idclass')
      .eq('iduser', iduser);

    if (classError) throw classError;

    if (!classes || classes.length === 0) {
      console.log('No classes found for user:', iduser);
      return res.json({ success: true, videos: [] });
    }

    const classIds = classes.map(c => c.idclass);
    if (classIds.length === 0) {
      console.log('No class IDs found.');
      return res.json({ success: true, videos: [] });
    }

    // Lấy đường link video cho các lớp này, sắp xếp theo upload_time và giới hạn 2 video
    const { data: videos, error: videoError } = await supabase
      .from('videolink') // Đảm bảo rằng tên bảng là 'videolink'
      .select('*')
      .in('idclass', classIds)
      .order('upload_date', { ascending: false }) // Sắp xếp theo thời gian upload mới nhất
      .limit(2); // Giới hạn chỉ lấy 2 video

    if (videoError) throw videoError;

    res.json({ success: true, videos: videos || [] });
  } catch (error) {
    console.error('Error fetching videos:', error.message || error);
    res.status(500).json({ success: false, error: 'Failed to fetch videos' });
  }
});

app.get('/api/studentvideos/:iduser', async (req, res) => {
  const { iduser } = req.params;

  try {
    // 1. Lấy thông tin lớp học của sinh viên
    const { data: classes, error: classError } = await supabase
      .from('classes') // Đảm bảo rằng đây là tên bảng đúng
      .select('idclass')
      .eq('iduser', iduser);

    if (classError) {
      console.error('Error fetching classes:', classError);
      return res.status(500).json({ success: false, error: 'Failed to fetch classes' });
    }

    if (!classes || classes.length === 0) {
      console.log('No classes found for user:', iduser);
      return res.json({ success: true, videos: [] });
    }

    const classIds = classes.map(c => c.idclass);

    // 2. Lấy đường link video cho các lớp này
    const { data: videos, error: videoError } = await supabase
      .from('videolink') // Đảm bảo rằng tên bảng là 'videolink'
      .select('*')
      .in('idclass', classIds);

    if (videoError) {
      console.error('Error fetching videos:', videoError);
      return res.status(500).json({ success: false, error: 'Failed to fetch videos' });
    }

    // Trả về danh sách video
    res.json({ success: true, videos: videos || [] });
  } catch (error) {
    console.error('Error fetching videos:', error.message || error);
    res.status(500).json({ success: false, error: 'Failed to fetch videos' });
  }
});


app.post('/api/upload-video', async (req, res) => {
  const { idclass, namevideo, linkvideo } = req.body;

  // Kiểm tra dữ liệu đầu vào
  if (!idclass || !namevideo || !linkvideo) {
    return res.status(400).json({ success: false, message: 'Missing required fields' });
  }

  // Tạo timestamp cho upload_date
  const upload_date = new Date().toISOString(); // ISO 8601 format: 'YYYY-MM-DDTHH:MM:SSZ'

  try {
    // Chèn dữ liệu vào bảng videolink
    const { data, error } = await supabase
      .from('videolink')
      .insert([
        { idclass, namevideo, linkvideo, upload_date }
      ]);

    if (error) {
      console.error('Error inserting data:', error);
      return res.status(500).json({ success: false, message: 'Error inserting video into database' });
    }

    // Thành công
    res.status(200).json({ success: true, message: 'Video uploaded successfully' });
  } catch (err) {
    console.error('Server error:', err);
    res.status(500).json({ success: false, message: 'Server error while uploading video' });
  }
});

app.get('/api/get-notifications', async (req, res) => {
  try {
    const iduser = req.session.user.iduser;

    // Bước 1: Lấy tất cả các idclass mà sinh viên tham gia
    const { data: classes, error: classError } = await supabase
      .from('classes')
      .select('idclass')
      .eq('iduser', iduser);

    if (classError) {
      throw classError;
    }

    // Lấy danh sách idclass
    const idclasses = classes.map(c => c.idclass);

    // Bước 2: Lấy tất cả thông báo từ các lớp mà sinh viên tham gia
    const { data: notifications, error: notificationError } = await supabase
      .from('information')
      .select('*')
      .in('idclass', idclasses)
      .order('createdat', { ascending: false });

    if (notificationError) {
      throw notificationError;
    }

    res.json({ notifications });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Có lỗi xảy ra khi tải thông báo' });
  }
});

// Route để hiển thị tất cả video của lớp học dựa vào idclass - admin
app.get('/allvideo', async (req, res) => {
  const { idclass } = req.query; // Lấy idclass từ query parameter

  // Kiểm tra xem idclass có được cung cấp không
  if (!idclass) {
    return res.status(400).send('Thiếu idclass trong request.');
  }

  try {
      // Truy vấn lấy tất cả video theo idclass
      const { data: videos, error } = await supabase
          .from('videolink') // Tên bảng videolink
          .select('namevideo, linkvideo, upload_date')
          .eq('idclass', idclass); // Lọc theo idclass

      if (error) {
          console.error('Lỗi khi truy vấn từ Supabase:', error);
          return res.status(500).send('Có lỗi xảy ra khi truy vấn dữ liệu.');
      }

      // Nếu không có video nào cho idclass này
      if (videos.length === 0) {
          return res.render('allvideo', {
              className: idclass, // Truyền idclass để hiển thị
              videos: [], // Danh sách video trống
              message: 'Không có video nào cho lớp học này.' // Hiển thị thông báo
          });
      }

      // Nếu có dữ liệu, render ra trang allvideo.ejs
      res.render('allvideo', {
          className: idclass, // Truyền idclass để hiển thị
          videos: videos // Truyền danh sách video
      });
  } catch (error) {
      console.error('Lỗi khi xử lý request:', error);
      res.status(500).send('Lỗi máy chủ.');
  }
});

app.get('/allnotifications', async (req, res) => {
  const { idclass } = req.query; // Lấy idclass từ query parameter

  try {
    // Truy vấn tất cả thông báo theo idclass
    const { data: notifications, error } = await supabase
      .from('information') // Tên bảng thông báo
      .select('content, createdat')
      .eq('idclass', idclass) // Lọc theo idclass
      .order('createdat', { ascending: false }); // Sắp xếp theo ngày tạo

    if (error) {
      console.error('Lỗi khi truy vấn từ Supabase:', error);
      return res.status(500).send('Có lỗi xảy ra khi truy vấn dữ liệu.');
    }

    // Render trang allnotifications.ejs
    res.render('allnotifications', {
      className: idclass, // Truyền idclass để hiển thị
      notifications: notifications || [] // Truyền danh sách thông báo
    });
  } catch (error) {
    console.error('Lỗi khi xử lý request:', error);
    res.status(500).send('Lỗi máy chủ.');
  }
});

app.post('/delete-notification', async (req, res) => {
  const { content, idclass } = req.body;
  console.log(`Received content: ${content}, idclass: ${idclass}`);

  try {
      const { data, error } = await supabase
          .from('information')
          .delete()
          .match({ content: content, idclass: idclass });

      if (error) {
          console.error('Supabase error:', error);
          throw error;
      }

      if (data && data.length > 0) {
          res.json({ success: true, message: 'Thông báo đã được xóa thành công.' });
      } else {
          res.status(404).json({ success: false, message: 'Không tìm thấy thông báo để xóa.' });
      }
  } catch (error) {
      console.error('Lỗi khi xóa thông báo:', error);
      res.status(500).json({ success: false, message: 'Đã xảy ra lỗi khi xóa thông báo.' });
  }
});

app.post('/delete-video', async (req, res) => {
  const { namevideo, linkvideo, idclass } = req.body;
  
  try {
    const { error } = await supabase
      .from('videolink')
      .delete()
      .match({ namevideo, linkvideo, idclass });
    
    if (error) throw error;
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting video:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

//them bai hoc 



// Route để hiển thị trang tạo bài học
app.get('/admin/create-lesson', (req, res) => {
  res.render('lesson', { title: 'Tạo Bài Học Mới' });
});

// Route để xử lý việc lưu bài học mới
app.post('/admin/create-lesson', async (req, res) => {
  const { title, description, content } = req.body;

  try {
    // Ở đây bạn sẽ thêm logic để lưu bài học vào Supabase
    // Ví dụ:
    const { data, error } = await supabase
      .from('lessons')
      .insert([{ title, description, content }]);

    if (error) throw error;

    res.json({ success: true, message: 'Bài học đã được lưu thành công' });
  } catch (error) {
    console.error('Lỗi khi lưu bài học:', error);
    res.status(500).json({ success: false, message: 'Có lỗi xảy ra khi lưu bài học' });
  }
});

//xử lý lưu bài học
// Route để xử lý việc lưu bài học mới
app.post('/admin/create-lesson', async (req, res) => {
  const { title, description, content } = req.body;

  try {
    // Ở đây bạn sẽ thêm logic để lưu bài học vào Supabase
    // Ví dụ:
    const { data, error } = await supabase
      .from('lessons')
      .insert([{ title, description, content }]);

    if (error) throw error;

    res.json({ success: true, message: 'Bài học đã được lưu thành công' });
  } catch (error) {
    console.error('Lỗi khi lưu bài học:', error);
    res.status(500).json({ success: false, message: 'Có lỗi xảy ra khi lưu bài học' });
  }
});

//hien thi bai hoc
// Route hiển thị danh sách bài học
const cheerio = require('cheerio');

function extractFirstImageUrl(content) {
  const $ = cheerio.load(content);
  const firstImg = $('img').first();
  return firstImg.length ? firstImg.attr('src') : null;
}

app.get('/lessons', async (req, res) => {
  try {
    const { data: lessons, error } = await supabase
      .from('lessons')
      .select('*');

    if (error) throw error;

    // Thêm trường firstImageUrl vào mỗi lesson
    const lessonsWithImages = lessons.map(lesson => ({
      ...lesson,
      firstImageUrl: extractFirstImageUrl(lesson.content)
    }));

    res.render('getlesson', { lessons: lessonsWithImages });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).send('Server error');
  }
});

// Chi tiết bài học route
app.get('/lessons/detail/:id', async (req, res) => {
  const lessonId = req.params.id;
  try {
    // Lấy bài học hiện tại
    const { data: lesson, error } = await supabase
      .from('lessons')
      .select('*')
      .eq('id', lessonId)
      .single();

    if (error) throw error;

    // Kiểm tra nếu không tìm thấy bài học
    if (!lesson) {
      return res.status(404).send('Không tìm thấy bài học.');
    }

    // Lấy bài học trước đó dựa trên created_at
    const { data: previousLessons, error: prevError } = await supabase
      .from('lessons')
      .select('id, title')
      .lt('created_at', lesson.created_at) // Sử dụng thời gian tạo bài học
      .order('created_at', { ascending: false }) // Sắp xếp giảm dần để lấy bài học gần nhất trước đó
      .limit(1);

    if (prevError) throw prevError;

    // Lấy bài học tiếp theo dựa trên created_at
    const { data: nextLessons, error: nextError } = await supabase
      .from('lessons')
      .select('id, title')
      .gt('created_at', lesson.created_at) // Sử dụng thời gian tạo bài học
      .order('created_at', { ascending: true }) // Sắp xếp tăng dần để lấy bài học tiếp theo
      .limit(1);

    if (nextError) throw nextError;

    // Kiểm tra nếu có bài học trước và tiếp theo
    const previousLesson = previousLessons.length > 0 ? previousLessons[0] : null;
    const nextLesson = nextLessons.length > 0 ? nextLessons[0] : null;

    // Render trang với thông tin bài học và các liên kết bài trước, bài tiếp theo
    res.render('lessondetail', { lesson, previousLesson, nextLesson });
  } catch (error) {
    console.error('Lỗi khi lấy chi tiết bài học:', error.message);
    res.status(500).send('Có lỗi xảy ra khi lấy chi tiết bài học: ' + error.message);
  }
});

app.post('/api/lessons/update-view', async (req, res) => {
  try {
      const { lessonId, currentViews } = req.body;

      if (!lessonId) {
          return res.status(400).json({ error: 'Lesson ID is required' });
      }

      const newViewCount = (currentViews || 0) + 1;

      // Cập nhật lượt xem trong Supabase
      const { data, error } = await supabase
          .from('lessons')
          .update({ viewer: newViewCount })
          .eq('id', lessonId)
          .single();

      if (error) {
          console.error('Supabase error:', error);
          return res.status(500).json({ error: 'Failed to update view count' });
      }

      return res.json({ success: true, newViewCount });

  } catch (error) {
      console.error('Server error:', error);
      return res.status(500).json({ error: 'Internal server error' });
  }
});


app.get('/graduation/:id/:classId', isAuthenticated, async (req, res) => {
  const studentId = req.params.id;
  const classId = req.params.classId; // Lấy classId từ params

  try {
      // Lấy thông tin tốt nghiệp của sinh viên từ bảng graduation
      const { data: graduationData, error: graduationError } = await supabase
          .from('graduation')
          .select('*')
          .eq('iduser', studentId)
          .eq('idclass', classId)
          .single();

      if (graduationError) {
          console.error('Lỗi khi lấy thông tin tốt nghiệp:', graduationError);
          return res.status(500).send('Có lỗi xảy ra khi lấy thông tin tốt nghiệp.');
      }

      // Lấy thông tin sinh viên từ bảng users
      const { data: studentData, error: studentError } = await supabase
          .from('users')
          .select('*')
          .eq('iduser', studentId)
          .single();

      if (studentError) {
          console.error('Lỗi khi lấy thông tin sinh viên:', studentError);
          return res.status(500).send('Có lỗi xảy ra khi lấy thông tin sinh viên.');
      }

      // Lấy thông tin lớp học mà sinh viên tham gia (dựa vào studentId và classId)
      const { data: classData, error: classError } = await supabase
          .from('classes')
          .select('nameclass')
          .eq('idclass', classId)
          .eq('iduser', studentId) // Lọc theo iduser
          .limit(1); // Giới hạn số dòng trả về

      if (classError) {
          console.error('Lỗi khi lấy thông tin lớp:', classError.message);
          return res.status(500).send('Có lỗi xảy ra khi lấy thông tin lớp học.');
      }

      // Kiểm tra nếu không tìm thấy lớp học
      if (classData.length === 0) {
          return res.status(404).send('Không tìm thấy lớp học.');
      }

// Lấy thông tin điểm của sinh viên (dựa vào studentId và classId)
const { data: scoreData, error: scoreError } = await supabase
    .from('score')
    .select('final_score')
    .eq('idclass', classId)
    .eq('iduser', studentId); // Lọc theo iduser

if (scoreError) {
    console.error('Lỗi khi lấy thông tin điểm:', scoreError.message);
    return res.status(500).send('Có lỗi xảy ra khi lấy thông tin điểm.');
}

const gpa = (scoreData && scoreData.length > 0) ? scoreData[0].final_score : null; // Đặt là null nếu không có điểm
  

      // Render trang graduation.ejs với dữ liệu của sinh viên
      res.render('graduation', { student: studentData, graduation: graduationData, className: classData[0].nameclass, gpa: gpa });
  } catch (error) {
      console.error('Lỗi:', error);
      res.status(500).send('Đã xảy ra lỗi: ' + error.message);
  }
});

app.get('/stdgraduation/:id/:classId', isAuthenticated, async (req, res) => {
  const studentId = req.params.id;
  const classId = req.params.classId; // Lấy classId từ params

  try {
      // Lấy thông tin tốt nghiệp của sinh viên từ bảng graduation
      const { data: graduationData, error: graduationError } = await supabase
          .from('graduation')
          .select('*')
          .eq('iduser', studentId)
          .eq('idclass', classId)
          .single();

      if (graduationError) {
          console.error('Lỗi khi lấy thông tin tốt nghiệp:', graduationError);
          return res.status(500).send('Có lỗi xảy ra khi lấy thông tin tốt nghiệp.');
      }

      // Lấy thông tin sinh viên từ bảng users
      const { data: studentData, error: studentError } = await supabase
          .from('users')
          .select('*')
          .eq('iduser', studentId)
          .single();

      if (studentError) {
          console.error('Lỗi khi lấy thông tin sinh viên:', studentError);
          return res.status(500).send('Có lỗi xảy ra khi lấy thông tin sinh viên.');
      }

      // Lấy thông tin lớp học mà sinh viên tham gia (dựa vào studentId và classId)
      const { data: classData, error: classError } = await supabase
          .from('classes')
          .select('nameclass')
          .eq('idclass', classId)
          .eq('iduser', studentId) // Lọc theo iduser
          .limit(1); // Giới hạn số dòng trả về

      if (classError) {
          console.error('Lỗi khi lấy thông tin lớp:', classError.message);
          return res.status(500).send('Có lỗi xảy ra khi lấy thông tin lớp học.');
      }

      // Kiểm tra nếu không tìm thấy lớp học
      if (classData.length === 0) {
          return res.status(404).send('Không tìm thấy lớp học.');
      }

// Lấy thông tin điểm của sinh viên (dựa vào studentId và classId)
const { data: scoreData, error: scoreError } = await supabase
    .from('score')
    .select('final_score')
    .eq('idclass', classId)
    .eq('iduser', studentId); // Lọc theo iduser

if (scoreError) {
    console.error('Lỗi khi lấy thông tin điểm:', scoreError.message);
    return res.status(500).send('Có lỗi xảy ra khi lấy thông tin điểm.');
}

const gpa = (scoreData && scoreData.length > 0) ? scoreData[0].final_score : null; // Đặt là null nếu không có điểm
  

      // Render trang graduation.ejs với dữ liệu của sinh viên
      res.render('stdgraduation', { student: studentData, graduation: graduationData, className: classData[0].nameclass, gpa: gpa });
  } catch (error) {
      console.error('Lỗi:', error);
      res.status(500).send('Đã xảy ra lỗi: ' + error.message);
  }
});


// Route xử lý cập nhật graduation
app.post('/api/update-graduation', async (req, res) => {
  try {
      const { 
          idclass, 
          iduser, 
          rank,
          evaluation1,
          evaluation2,
          evaluation3,
          evaluation4,
          evaluation5,
          evaluation6,
          evaluation7,
          evaluation8,
          evaluation9,
          evaluation10,
          evaluation11,
          evaluation12,
          isgraduation
      } = req.body;

      // Validate input
      if (!idclass || !iduser) {
          return res.status(400).json({
              success: false,
              message: 'Missing required fields: idclass and iduser'
          });
      }

      // Kiểm tra sự tồn tại của bản ghi
      const { data: existingRecord, error: findError } = await supabase
          .from('graduation')
          .select('*')
          .match({ idclass, iduser });

      if (findError) {
          console.error('Error finding graduation record:', findError);
          return res.status(500).json({
              success: false,
              message: 'Error finding graduation record',
              error: findError.message
          });
      }

      // Nếu không có bản ghi, trả về thông báo
      if (!existingRecord || existingRecord.length === 0) {
          return res.status(404).json({
              success: false,
              message: 'No graduation record found for the specified idclass and iduser'
          });
      }

      // Chuẩn bị dữ liệu để update
      const updateData = {};
      if (rank) updateData.rank = rank;
      if (evaluation1) updateData.evaluation1 = evaluation1;
      if (evaluation2) updateData.evaluation2 = evaluation2;
      if (evaluation3) updateData.evaluation3 = evaluation3;
      if (evaluation4) updateData.evaluation4 = evaluation4;
      if (evaluation5) updateData.evaluation5 = evaluation5;
      if (evaluation6) updateData.evaluation6 = evaluation6;
      if (evaluation7) updateData.evaluation7 = evaluation7;
      if (evaluation8) updateData.evaluation8 = evaluation8;
      if (evaluation9) updateData.evaluation9 = evaluation9;
      if (evaluation10) updateData.evaluation10 = evaluation10;
      if (evaluation11) updateData.evaluation11 = evaluation11;
      if (evaluation12) updateData.evaluation12 = evaluation12;
      if (isgraduation) updateData.isgraduation = isgraduation;
      // Log dữ liệu trước khi cập nhật
      //console.log('Update Data:', updateData);

      // Thực hiện update trong Supabase
      const { data, error } = await supabase
          .from('graduation')
          .update(updateData)
          .match({ 
              idclass: idclass,
              iduser: iduser 
          });

      if (error) {
          console.error('Supabase update error:', error);
          return res.status(500).json({
              success: false,
              message: 'Error updating graduation data',
              error: error.message
          });
      }

      // Trả về kết quả thành công
      res.json({
          success: true,
          message: 'Graduation data updated successfully',
          data: data
      });

  } catch (error) {
      console.error('Server error:', error);
      res.status(500).json({
          success: false,
          message: 'Internal server error',
          error: error.message
      });
  }
});

app.post('/api/graduation/toggle', async (req, res) => {
  try {
      const { iduser, idclass, isLocked } = req.body;
      
      // Log để kiểm tra dữ liệu nhận được
      console.log('Received data:', { iduser, idclass, isLocked });

      // Cập nhật bảng graduation trong Supabase
      const { data, error } = await supabase
          .from('graduation')
          .update({ islocked: isLocked })
          .match({ iduser: iduser, idclass: idclass });

      if (error) throw error;

      res.json({ success: true });
  } catch (error) {
      console.error('Error updating graduation status:', error);
      res.status(500).json({ 
          success: false, 
          message: 'Có lỗi xảy ra khi cập nhật trạng thái tốt nghiệp' 
      });
  }
});

//lay trang thai
app.get('/api/graduation/status', async (req, res) => {
  const { iduser, idclass } = req.query;

  try {
      // Lấy trạng thái islocked từ bảng graduation
      const { data, error } = await supabase
          .from('graduation')
          .select('islocked')
          .match({ iduser: iduser, idclass: idclass })
          .single(); // Đảm bảo chỉ trả về một bản ghi

      if (error) throw error;

      res.json({ isLocked: data.islocked });
  } catch (error) {
      console.error('Error fetching graduation status:', error);
      res.status(500).json({ message: 'Có lỗi xảy ra khi lấy trạng thái tốt nghiệp' });
  }
});

// Route để kiểm tra trạng thái islocked
app.post('/check-graduation-status', async (req, res) => {
  try {
      const { iduser, idclass } = req.body;

      // Kiểm tra xem có dữ liệu gửi lên không
      if (!iduser || !idclass) {
          return res.status(400).json({
              success: false,
              message: 'Missing required parameters'
          });
      }

      // Truy vấn Supabase để kiểm tra islocked
      const { data, error } = await supabase
          .from('graduation')
          .select('islocked')
          .eq('iduser', iduser)
          .eq('idclass', idclass)
          .single();

      if (error) {
          console.error('Supabase query error:', error);
          return res.status(500).json({
              success: false,
              message: 'Database query error',
              error: error.message
          });
      }

      // Nếu không tìm thấy dữ liệu, coi như đã khóa
      if (!data) {
          return res.json({
              success: true,
              islocked: true,
              message: 'No graduation data found'
          });
      }

      // Trả về kết quả
      return res.json({
          success: true,
          islocked: data.islocked,
          message: 'Successfully retrieved lock status'
      });

  } catch (err) {
      console.error('Server error:', err);
      return res.status(500).json({
          success: false,
          message: 'Internal server error',
          error: err.message
      });
  }
});


// Route cho trang About Us
app.get('/aboutus', (req, res) => {
  res.render('aboutus');  // Điều này sẽ render file aboutus.ejs
});
function isAuthenticated2(req, res, next) {
  if (req.session && req.session.user) {
    next(); // Nếu đã đăng nhập, tiếp tục
  } else {
    res.redirect('/elearning-login'); // Nếu chưa đăng nhập, điều hướng đến trang đăng nhập
  }
}

app.get('/exam/:iduser/:idclass', isAuthenticated2, async (req, res) => {
  const { iduser, idclass } = req.params;

  // Truy vấn bảng exam dựa trên idclass
  const { data: exams, error: examError } = await supabase
      .from('exam')
      .select('*')
      .eq('idclass', idclass);

  if (examError) {
      console.error(examError);
      return res.status(500).send('Đã xảy ra lỗi khi lấy thông tin bài thi.');
  }

  // Truy vấn bảng classes để lấy nameclass
  const { data: classInfo, error: classError } = await supabase
      .from('classes')
      .select('nameclass')
      .eq('idclass', idclass)
      .limit(1); // Giữ lại limit(1) ở đây

  if (classError) {
      console.error(classError);
      return res.status(500).send('Đã xảy ra lỗi khi lấy thông tin lớp học.');
  }

  // Kiểm tra nếu classInfo có dữ liệu
  const nameclass = classInfo.length > 0 ? classInfo[0].nameclass : 'Không tìm thấy lớp học';

  // Lấy thông tin nộp bài giữa kỳ của sinh viên
  const { data: midtermSubmission, error: midtermError } = await supabase
      .from('submission')
      .select('*')
      .eq('iduser', iduser)
      .eq('idclass', idclass)
      .eq('term', 'Midterm') // Lọc theo loại bài thi giữa kỳ
      .order('time_nop_bai', { ascending: false }) // Lấy lần nộp bài gần nhất
      .limit(1);


  // Kiểm tra lỗi và dữ liệu nộp bài
  if (midtermError) {
      console.error(midtermError);
      return res.status(500).send('Đã xảy ra lỗi khi kiểm tra thông tin nộp bài giữa kỳ.');
  }

  // Kiểm tra nếu có dữ liệu nộp bài giữa kỳ
  const midtermSubmissionData = midtermSubmission.length > 0 ? midtermSubmission[0] : null;
  //console.log("Midterm Submission Data:", midtermSubmissionData); // Thêm dòng này để kiểm tra

  // Lấy thông tin nộp bài cuối kỳ của sinh viên
  const { data: finaltermSubmission, error: finaltermError } = await supabase
      .from('submission')
      .select('*')
      .eq('iduser', iduser)
      .eq('idclass', idclass)
      .eq('term', 'Finalterm') // Lọc theo loại bài thi cuối kỳ
      .order('time_nop_bai', { ascending: false }) // Lấy lần nộp bài gần nhất
      .limit(1);


  // Kiểm tra lỗi và dữ liệu nộp bài cuối kỳ
  if (finaltermError) {
      console.error(finaltermError);
      return res.status(500).send('Đã xảy ra lỗi khi kiểm tra thông tin nộp bài cuối kỳ.');
  }

  // Kiểm tra nếu có dữ liệu nộp bài cuối kỳ
  const finaltermSubmissionData = finaltermSubmission.length > 0 ? finaltermSubmission[0] : null;


  const { data: topicData, topicError } = await supabase
  .from('topics')
  .select('*')
  //.order('createdAt', { ascending: false });

if (topicError) {
  throw topicError;
}
const upcomingDeadlines = topicData.filter(t => isUpcomingDeadline(t.deadline)).length;
const activeTopics = topicData.filter(t => !isExpired(t.deadline)).length;
const expiredTopics = topicData.filter(t => isExpired(t.deadline)).length;

  // Truyền dữ liệu vào EJS
  res.render('exam', { 
      exams, 
      nameclass,
      topicData, 
      totalTopics: topicData.length,
      upcomingDeadlines,
      activeTopics,
      expiredTopics,
      formatDate,
      isUpcomingDeadline,
      isExpired,
      getTopicStatus,
      midtermSubmission: midtermSubmissionData,
      finaltermSubmission: finaltermSubmissionData // Thêm dữ liệu nộp bài cuối kỳ
  });
});


app.get('/examdetail', isAuthenticated, async (req, res) => {
  try {
      const { data: exams, error } = await supabase
          .from('exam')
          .select('*')
          .order('createdat', { ascending: false });

      if (error) throw error;

      res.render('examdetail', { exams });
  } catch (err) {
      console.error(err);
      res.status(500).send('Lỗi server');
  }
});

// Route thêm kỳ thi mới
// Cấu hình multer để lưu file trong bộ nhớ tạm
const storage1 = multer.memoryStorage();
const upload1 = multer({ storage: storage1 });

// Route thêm kỳ thi mới
app.post('/admin/exam/add', upload1.fields([
  { name: 'file1', maxCount: 1 },
  { name: 'file2', maxCount: 1 },
  { name: 'file3', maxCount: 1 },
  { name: 'file4', maxCount: 1 },
  { name: 'file5', maxCount: 1 }
]), async (req, res) => {
  try {
      const { idclass, term, deadline } = req.body;
      const files = req.files;
      const fileFields = {};

      // Duyệt qua các file và tải từng file lên bucket trên Supabase
      for (const field of ['file1', 'file2', 'file3', 'file4', 'file5']) {
          if (files[field] && files[field][0]) {
              const file = files[field][0];
              const filePath = `exams/${term}_${idclass}/${file.originalname}`;

              // Tải file lên Supabase Storage bucket "exam_file"
              const { data, error: uploadError } = await supabase.storage
                  .from('exam_file')
                  .upload(filePath, file.buffer, {
                      contentType: file.mimetype,
                  });

              if (uploadError) {
                  console.error(`Lỗi tải file lên Supabase: ${uploadError.message}`);
                  throw uploadError;
              }

              // Tạo URL công khai cho file đã tải lên
              const publicUrl = `https://wkyayquvflwwtnuvqhox.supabase.co/storage/v1/object/public/exam_file/${filePath}`;
              fileFields[field] = publicUrl; // Lưu URL của file trong đối tượng `fileFields`
          } else {
              fileFields[field] = null; // Không có file thì gán null
          }
      }

      // Thêm thông tin kỳ thi vào cơ sở dữ liệu Supabase
      const { error } = await supabase
          .from('exam')
          .insert([{
              idclass,
              term,
              file1: fileFields.file1,
              file2: fileFields.file2,
              file3: fileFields.file3,
              file4: fileFields.file4,
              file5: fileFields.file5,
              createdat: new Date().toLocaleString(),
              deadline
          }]);

      if (error) throw error;

      res.json({ success: true, message: 'Kỳ thi đã được thêm thành công', files: fileFields });
  } catch (err) {
      console.error(err);
      res.status(500).send('Lỗi server');
  }
});

// Route cập nhật kỳ thi
// Route để lấy thông tin kỳ thi
  app.get('/admin/exam/:examId', isAuthenticated, async (req, res) => {
    const { examId } = req.params;
    const { data: exam, error } = await supabase
        .from('exam')
        .select('*')
        .eq('id', examId)
        .single();

    if (error || !exam) {
        return res.status(404).json({ success: false, message: 'Kỳ thi không tìm thấy.' });
    }

    res.json(exam);
  });

  // Route để chỉnh sửa kỳ thi
  app.post('/admin/exam/edit', upload1.fields([
    { name: 'file1', maxCount: 1 },
    { name: 'file2', maxCount: 1 },
    { name: 'file3', maxCount: 1 },
    { name: 'file4', maxCount: 1 },
    { name: 'file5', maxCount: 1 }
]), async (req, res) => {
    try {
        const { examId, idclass, term, deadline } = req.body;
        const files = req.files;

        // Lấy thông tin kỳ thi hiện tại từ cơ sở dữ liệu
        const { data: currentExam, error: selectError } = await supabase
            .from('exam')
            .select('*')
            .eq('id', examId)
            .single();

        if (selectError || !currentExam) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy kỳ thi.' });
        }

        const updateFields = {
            idclass: idclass || currentExam.idclass,
            term: term || currentExam.term,
            deadline: deadline || currentExam.deadline,
        };

        // Cập nhật các file
        for (const field of ['file1', 'file2', 'file3', 'file4', 'file5']) {
            if (files[field] && files[field][0]) {
                const file = files[field][0];
                const filePath = `exams/${term}_${idclass}/${file.originalname}`;

                // Kiểm tra xem file đã tồn tại trong Supabase Storage chưa
                const { data: existingFiles, error: checkError } = await supabase.storage
                    .from('exam_file')
                    .list(`exams/${term}_${idclass}`, { limit: 100 });

                const fileExists = existingFiles.some(item => item.name === file.originalname);

                if (!fileExists) {
                    // Nếu file không tồn tại, tải file lên Supabase Storage
                    const { data, error: uploadError } = await supabase.storage
                        .from('exam_file')
                        .upload(filePath, file.buffer, {
                            contentType: file.mimetype,
                        });

                    if (uploadError) {
                        console.error(`Lỗi tải file lên Supabase: ${uploadError.message}`);
                        throw uploadError;
                    }

                    // Tạo URL công khai cho file đã tải lên
                    const publicUrl = `https://wkyayquvflwwtnuvqhox.supabase.co/storage/v1/object/public/exam_file/${filePath}`;
                    updateFields[field] = publicUrl; // Lưu URL của file trong đối tượng `updateFields`
                } else {
                    // Nếu file đã tồn tại, giữ nguyên URL cũ
                    updateFields[field] = currentExam[field]; // Giữ nguyên file cũ nếu đã tồn tại
                }

                // Xóa file cũ nếu có
                if (currentExam[field] && !fileExists) {
                    // Xóa file cũ khỏi Supabase Storage
                    const { error: deleteError } = await supabase.storage
                        .from('exam_file')
                        .remove([currentExam[field].replace('https://wkyayquvflwwtnuvqhox.supabase.co/storage/v1/object/public/exam_file/', '')]);

                    if (deleteError) {
                        console.error(`Lỗi xóa file cũ: ${deleteError.message}`);
                    }
                }
            } else {
                updateFields[field] = currentExam[field]; // Giữ nguyên file cũ nếu không có file mới
            }
        }

        // Cập nhật thông tin kỳ thi trong cơ sở dữ liệu
        const { error: updateError } = await supabase
            .from('exam')
            .update(updateFields)
            .eq('id', examId);

        if (updateError) throw updateError;

        // Trả về phản hồi dạng JSON
        res.json({ success: true, message: 'Cập nhật thành công!' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
});


//sinh vien nop bai


// Thiết lập lưu trữ cho multer
app.post('/submit-exam/:iduser/:idclass', upload1.single('submission'), async (req, res) => {
  try {
    const { examType } = req.body;
    const iduser = req.params.iduser;
    const idclass = req.params.idclass;
    const term = examType;
    const timeNopBai = new Date().toLocaleString();

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Không có file nào được upload.' });
    }

    // Tách tên file và phần mở rộng
    const fileExtension = req.file.originalname.split('.').pop();
    const fileName = req.file.originalname.split('.').slice(0, -1).join('.');
    let newFileName = req.file.originalname;
    let filePath = `submission/submission_${iduser}_${term}/${newFileName}`;
    let isRenamed = false;

    try {
      const { data: existingFiles } = await supabase.storage
        .from('exam_file')
        .list(`submission/submission_${iduser}_${term}`);

      if (existingFiles) {
        // Lọc ra các file có cùng tên gốc
        const similarFiles = existingFiles.filter(file => {
          // Kiểm tra cả file gốc và file có "-nop lan" trong tên
          const basePattern = new RegExp(`^${fileName}\\.${fileExtension}$`);
          const submitPattern = new RegExp(`^${fileName}-nop lan \\d+\\.${fileExtension}$`);
          return basePattern.test(file.name) || submitPattern.test(file.name);
        });

        if (similarFiles.length > 0) {
          // Tìm số lần nộp lớn nhất hiện tại
          let maxNumber = 0;
          similarFiles.forEach(file => {
            const match = file.name.match(/-nop lan (\d+)\./);
            if (match) {
              const num = parseInt(match[1]);
              maxNumber = Math.max(maxNumber, num);
            }
          });

          // Nếu chưa có file "-nop lan" nào, file đầu tiên sẽ là "-nop lan 2"
          const nextNumber = maxNumber === 0 ? 2 : maxNumber + 1;
          
          // Tạo tên file mới
          newFileName = `${fileName}-nop lan ${nextNumber}.${fileExtension}`;
          filePath = `submission/submission_${iduser}_${term}/${newFileName}`;
          isRenamed = true;
        }
      }
    } catch (listError) {
      console.error('Lỗi khi kiểm tra file:', listError);
    }

    // Upload file với tên mới
    const { data, error: uploadError } = await supabase.storage
      .from('exam_file')
      .upload(filePath, req.file.buffer, {
        contentType: req.file.mimetype
      });

    if (uploadError) {
      console.error(`Lỗi tải file lên Supabase: ${uploadError.message}`);
      return res.status(500).json({ 
        success: false, 
        message: `Có lỗi xảy ra khi tải file lên: ${uploadError.message}` 
      });
    }

    const publicUrl = `https://wkyayquvflwwtnuvqhox.supabase.co/storage/v1/object/public/exam_file/${filePath}`;
    const capitalizedTerm = term.charAt(0).toUpperCase() + term.slice(1);

    const { error } = await supabase
      .from('submission')
      .upsert([{
        iduser: iduser,
        idclass: idclass,
        term: capitalizedTerm,
        time_nop_bai: timeNopBai,
        url_submit: publicUrl
      }]);

    if (error) throw error;

    res.json({ 
      success: true, 
      message: isRenamed ? 
        `Nộp bài thành công! File đã được đổi tên thành ${newFileName}` : 
        'Nộp bài thành công!'
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Có lỗi xảy ra khi nộp bài.' });
  }
});


app.get('/submitdetail/:idclass/:term', isAuthenticated, async (req, res) => {
  const { idclass, term } = req.params;
  const capitalizedTerm = term.charAt(0).toUpperCase() + term.slice(1);

  try {
      // Truy vấn dữ liệu từ bảng submissions
      const { data: submissions, error } = await supabase
          .from('submission')
          .select('*') // Chọn các trường cần thiết
          .eq('idclass', idclass)
          .eq('term', capitalizedTerm);

      if (error) {
          throw error; // Ném lỗi nếu có
      }

      // Render trang submitdetail.ejs và truyền dữ liệu
      res.render('submitdetail', { submissions, idclass, term });
  } catch (error) {
      console.error(error);
      res.status(500).send('Có lỗi xảy ra khi lấy dữ liệu từ Supabase.');
  }
});

//xoa ky thi
app.delete('/admin/exam/delete/:examId', async (req, res) => {
  const examId = req.params.examId;

  try {
      // Lấy thông tin kỳ thi để xác định các tệp liên quan
      const { data: exam, error: examError } = await supabase
          .from('exam')
          .select('*')
          .eq('id', examId)
          .single();

      if (examError || !exam) {
          return res.status(404).json({ success: false, message: 'Không tìm thấy kỳ thi.' });
      }

      const { idclass, term } = exam;

      // Xóa kỳ thi trong bảng exam
      const { error: deleteExamError } = await supabase
          .from('exam')
          .delete()
          .eq('id', examId);

      if (deleteExamError) {
          console.error(`Lỗi xóa kỳ thi: ${deleteExamError.message}`);
          return res.status(500).json({ success: false, message: 'Không thể xóa kỳ thi.' });
      }

      // Xóa các hàng tương ứng trong bảng submission
      const { error: deleteSubmissionError } = await supabase
          .from('submission')
          .delete()
          .eq('idclass', idclass)
          .eq('term', term);

      if (deleteSubmissionError) {
          console.error(`Lỗi xóa submission: ${deleteSubmissionError.message}`);
          return res.status(500).json({ success: false, message: 'Không thể xóa submission.' });
      }

      // Lấy danh sách file từ bucket `exam_file` trong thư mục `exams/${term}_${idclass}`
      const { data: files, error: listError } = await supabase.storage
          .from('exam_file')
          .list(`exams/${term}_${idclass}`, { limit: 100 });

      if (listError) {
          console.error(`Lỗi lấy danh sách tệp: ${listError.message}`);
          return res.status(500).json({ success: false, message: 'Không thể lấy danh sách tệp.' });
      }

      // Kiểm tra và xóa từng file trong bucket nếu danh sách files lấy về không rỗng
      if (files && files.length > 0) {
          const filePaths = files.map(file => `exams/${term}_${idclass}/${file.name}`);

          const { error: deleteFilesError } = await supabase.storage
              .from('exam_file')
              .remove(filePaths);

          if (deleteFilesError) {
              console.error(`Lỗi xóa tệp: ${deleteFilesError.message}`);
              return res.status(500).json({ success: false, message: 'Không thể xóa tệp.' });
          }
      } else {
          console.warn('Không tìm thấy tệp nào để xóa trong bucket exam_file.');
      }

      // Trả về phản hồi thành công
      res.json({ success: true, message: 'Đã xóa kỳ thi và các liên quan.' });
  } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: 'Lỗi server' });
  }
});

// thao luan

app.post('/api/topics', async (req, res) => {
  try {
      const { topicCode, topicName, deadline } = req.body;

      // Input validation
      if (!topicCode?.trim() || !topicName?.trim() || !deadline) {
          return res.status(400).json({
              success: false,
              message: 'Vui lòng điền đầy đủ thông tin đề tài'
          });
      }

      // Validate topicCode format
      if (!/^[A-Za-z0-9-_]+$/.test(topicCode)) {
          return res.status(400).json({
              success: false,
              message: 'Mã đề tài chỉ được chứa chữ cái, số và dấu gạch ngang'
          });
      }

      // Validate deadline is not in the past
      if (new Date(deadline) < new Date()) {
          return res.status(400).json({
              success: false,
              message: 'Thời hạn nộp không thể là thời điểm trong quá khứ'
          });
      }

      // Check for existing topic
      const { data: existingTopic, error: checkError } = await supabase
          .from('topics')
          .select('topic_code')
          .eq('topic_code', topicCode)
          .single();

      if (checkError && checkError.code !== 'PGRST116') { // Not found error is ok
          throw checkError;
      }

      if (existingTopic) {
          return res.status(400).json({
              success: false,
              message: 'Mã đề tài đã tồn tại'
          });
      }

      // Insert new topic
      const { data, error } = await supabase
          .from('topics')
          .insert([{
              topic_code: topicCode.trim(),
              topic_name: topicName.trim(),
              deadline: deadline,
              created_at: new Date().toLocaleString()
          }])
          .select();

      if (error) {
          console.error('Supabase error:', error);
          throw error;
      }

      return res.status(201).json({
          success: true,
          message: 'Thêm đề tài thành công',
          data: data[0]
      });

  } catch (error) {
      console.error('Server error:', error);
      return res.status(500).json({
          success: false,
          message: 'Lỗi server',
          error: error.message
      });
  }
});

// Route để render trang discussion.ejs
app.get('/discussion', isAuthenticated, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('topics')
      .select('*');

    if (error) {
      throw error;
    }

    const upcomingDeadlines = data.filter(t => isUpcomingDeadline(t.deadline)).length;
    const activeTopics = data.filter(t => !isExpired(t.deadline)).length;
    const expiredTopics = data.filter(t => isExpired(t.deadline)).length;

    // Render trang discussion.ejs và gửi dữ liệu vào
    res.render('discussion', {
      topics: data,
      examTopics: data,
      totalTopics: data.length,
      upcomingDeadlines,
      activeTopics,
      expiredTopics,
      formatDate,
      isUpcomingDeadline,
      isExpired,
      getTopicStatus
    });
    
  } catch (error) {
    console.error('Error fetching topics:', error);
    res.status(500).send('Lỗi khi lấy danh sách đề tài');
  }
});

function isUpcomingDeadline(deadline) {
  const deadlineDate = new Date(deadline);
  const now = new Date();
  const diffDays = Math.ceil((deadlineDate - now) / (1000 * 60 * 60 * 24));
  return diffDays > 0 && diffDays <= 20;
}

function isExpired(deadline) {
  return new Date(deadline) < new Date();
}

function formatDate(dateString) {
  const options = { 
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit',
      hour: '2-digit', 
      minute: '2-digit' 
  };
  return new Date(dateString).toLocaleDateString('vi-VN', options);
}

function getTopicStatus(deadline) {
  if (isExpired(deadline)) return 'Đã hết hạn';
  if (isUpcomingDeadline(deadline)) return 'Sắp hết hạn';
  return 'Đang hoạt động';
}

// Route để xóa đề tài
app.delete('/api/topics/:topicCode', async (req, res) => {
  try {
      const { topicCode } = req.params;

      const { error } = await supabase
          .from('topics')
          .delete()
          .eq('topicCode', topicCode);

      if (error) {
          throw error;
      }

      return res.status(200).json({
          success: true,
          message: 'Xóa đề tài thành công'
      });

  } catch (error) {
      console.error('Error deleting topic:', error);
      return res.status(500).json({
          success: false,
          message: 'Lỗi khi xóa đề tài',
          error: error.message
      });
  }
});

// Route để xem danh sách đề tài thảo luận
app.get('/discussion', isAuthenticated, async (req, res) => {
  try {
      // Lấy danh sách đề tài từ Supabase
      const { data: topics, error } = await supabase
          .from('topics')
          .select('*');

      if (error) throw error;

      res.render('discussion', { topics });
  } catch (error) {
      console.error('Error fetching topics:', error);
      res.status(500).send('Lỗi khi lấy danh sách đề tài.');
  }
});



app.get('/getTopics', isAuthenticated, async (req, res) => {
  try {
      const { data, error } = await supabase
          .from('topics')
          .select('topic_code, topic_name, deadline');

      if (error) {
          throw error;
      }

      return res.status(200).json(data);
  } catch (error) {
      console.error('Error fetching topics:', error);
      return res.status(500).json({ success: false, message: 'Lỗi khi lấy danh sách đề tài' });
  }
});


//submit topic
app.post('/submit-discussion/:idclass/:iduser', upload1.single('attachment'), async (req, res) => {
  const { idclass } = req.params;
  const { iduser } = req.params;

  
  try {
      const { topicId, groupInfo } = req.body;
      const attachment = req.file;

      // Validate required fields
      if (!topicId || !groupInfo) {
          return res.status(400).json({ 
              success: false, 
              message: 'Vui lòng điền đầy đủ thông tin đề tài và nhóm' 
          });
      }

      if (!attachment) {
          return res.status(400).json({ 
              success: false, 
              message: 'Vui lòng đính kèm file' 
          });
      }

     

      const submissionTime = new Date().toLocaleString();

      // Check topic deadline
      const { data: topicData, error: topicError } = await supabase
          .from('topics')
          .select('deadline')
          .eq('topic_code', topicId)
          .single();

      if (topicError || !topicData) {
          return res.status(404).json({ 
              success: false, 
              message: 'Đề tài không tồn tại' 
          });
      }

      const deadline = new Date(topicData.deadline);
      const late = submissionTime > deadline;

       // Generate unique filename
       const fileExtension = attachment.originalname.split('.').pop(); // Lấy phần mở rộng file
const fileBaseName = attachment.originalname.replace(`.${fileExtension}`, ''); // Lấy tên gốc file, bỏ phần mở rộng
const timestamp = new Date().toISOString().replace(/[-:.TZ]/g, ''); // Tạo timestamp (11042024)
//const uniqueFilename = `${fileBaseName}_${timestamp}.${fileExtension}`; // Kết hợp tên gốc + timestamp + phần mở rộng
const uniqueFilename = `${fileBaseName}.${fileExtension}`; // Kết hợp tên gốc + timestamp + phần mở rộng

const filePath = `discussion/Topic_${topicId}/${uniqueFilename}`; // Đường dẫn file đầy đủ


      // Upload file to Supabase Storage
      // filePath = `discussion/Topic_${topicId}/${attachment.originalname}`;
      
      // Tải file lên Supabase
      //const contentType = fileExtension === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

      let contentType;
switch (fileExtension) {
    case 'pdf':
        contentType = 'application/pdf';
        break;
    case 'docx':
        contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        break;
    case 'doc':
        contentType = 'application/msword';
        break;
    case 'zip':
        contentType = 'application/zip';
        break;
    case 'rar':
        contentType = 'application/vnd.rar';
        break;
    case 'jpg':
    case 'jpeg':
        contentType = 'image/jpeg';
        break;
    case 'png':
        contentType = 'image/png';
        break;
    case 'gif':
        contentType = 'image/gif';
        break;
    default:
        return res.status(400).json({
            success: false,
            message: 'Định dạng file không được hỗ trợ'
        });
}

      const { data: uploadData, error: uploadError } = await supabase
          .storage
          .from('exam_file')
          .upload(filePath, attachment.buffer, {
              contentType: contentType, // Đặt contentType dựa trên phần mở rộng
              cacheControl: '3600',
              upsert: false,
          });
      
      if (uploadError) {
          console.error('Error uploading file:', uploadError);
          return res.status(500).json({ 
              success: false, 
              message: 'Lỗi khi upload file' 
          });
      }

      // Tạo URL từ đường dẫn file đã upload
      const fileUrl = `https://wkyayquvflwwtnuvqhox.supabase.co/storage/v1/object/public/exam_file/${filePath}`;

      // Save submission to database
      const { error: insertError } = await supabase
          .from('submit_topic')
          .insert([{
              idclass,
              iduser,
              topic_code: topicId,
              infor: groupInfo,
              submit_url: fileUrl, // Sử dụng URL đầy đủ
              late,
              time_nop: submissionTime
          }]);

      if (insertError) {
          console.error('Error inserting submission:', insertError);
          return res.status(500).json({ 
              success: false, 
              message: 'Lỗi khi lưu thông tin nộp bài' 
          });
      }

      return res.status(201).json({ 
          success: true, 
          message: 'Nộp bài thành công',
          data: {
              late,
              submissionTime
          }
      });

  } catch (error) {
      console.error('Server error:', error);
      return res.status(500).json({ 
          success: false, 
          message: 'Lỗi server', 
          error: error.message 
      });
  }
});

app.get('/check-submission/:idclass/:iduser', async (req, res) => {
  const { idclass, iduser } = req.params;

  try {
      // Kiểm tra xem có bản nộp nào cho iduser và idclass không
      const { data: submissionData, error: submissionError } = await supabase
          .from('submit_topic')
          .select('*')
          .eq('idclass', idclass)
          .eq('iduser', iduser)
          .single(); // Chỉ lấy 1 bản ghi

      if (submissionError) {
          console.error('Error checking submission:', submissionError);
          return res.status(500).json({ success: false, message: 'Lỗi khi kiểm tra trạng thái nộp bài' });
      }

      if (submissionData) {
          return res.status(200).json({
              success: true,
              message: 'Bạn đã nộp bài thành công.',
              submission: submissionData // Trả về thông tin nộp bài
          });
      } else {
          return res.status(404).json({
              success: false,
              message: 'Bạn chưa nộp bài cho đề tài này.'
          });
      }

  } catch (error) {
      console.error('Server error:', error);
      return res.status(500).json({
          success: false,
          message: 'Lỗi server',
          error: error.message
      });
  }
});

//lay ket qua de tai
app.get('/topicresult/:topicCode', async (req, res) => {
  const topicCode = req.params.topicCode;

  try {
      // Lấy dữ liệu từ bảng submit_topic dựa trên topicCode
      const { data: results, error: submissionError } = await supabase
          .from('submit_topic')
          .select('*')
          .eq('topic_code', topicCode);

      if (submissionError) {
          throw submissionError; // Ném lỗi nếu xảy ra lỗi khi lấy dữ liệu từ bảng submit_topic
      }

      // Lấy tên đề tài từ bảng topics dựa trên topicCode
      const { data: topicData, error: topicError } = await supabase
          .from('topics')
          .select('topic_name')
          .eq('topic_code', topicCode)
          .single(); // Lấy một dòng duy nhất

      if (topicError) {
          throw topicError; // Ném lỗi nếu xảy ra lỗi khi lấy dữ liệu từ bảng topics
      }

      const topicName = topicData ? topicData.topic_name : 'Đề tài không tồn tại';

      // Render trang topicresult.ejs với dữ liệu
      res.render('topicresult', { topicCode, topicName, results });
  } catch (error) {
      console.error('Lỗi khi lấy dữ liệu từ Supabase:', error);
      res.status(500).send('Có lỗi xảy ra khi lấy dữ liệu.');
  }
});

// elearning.........................


app.get('/elearning-login', (req, res) => {
  // Lấy thông báo lỗi từ query parameters nếu có (để hiển thị lỗi sau khi redirect)
  const error = req.query.error;
  
  // Render trang login với các thông tin cần thiết
  res.render('elearninglogin', {
      title: 'Đăng nhập E-learning',
      error: error || null,
      previousUrl: req.session.returnTo || '/' // URL để quay lại sau khi đăng nhập
  });
});


// Middleware để lưu URL trước khi vào trang login (để redirect sau khi đăng nhập thành công)
app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/elearning-login')) {
      req.session.returnTo = req.originalUrl;
  }
  next();
});


app.post('/auth/elearning-login', async (req, res) => {
  const { username, password } = req.body;

  // Khởi tạo số lần đăng nhập cho người dùng nếu chưa có
  if (!loginAttempts[username]) {
    loginAttempts[username] = { count: 0, lockedUntil: null };
  }

  // Kiểm tra nếu tài khoản đã bị khóa
  const { count, lockedUntil } = loginAttempts[username];
  if (lockedUntil && Date.now() < lockedUntil) {
    const remainingTime = Math.ceil((lockedUntil - Date.now()) / 1000);
    return res.render('elearninglogin', { error: `Tài khoản đã bị khóa. Vui lòng thử lại sau ${remainingTime} giây.`, title: 'Đăng Nhập' });
  } else if (lockedUntil && Date.now() >= lockedUntil) {
    // Đặt lại số lần đăng nhập sai và thời gian khóa khi mở khóa
    loginAttempts[username] = { count: 0, lockedUntil: null };
  }

  try {
    // Kiểm tra tài khoản từ bảng users
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .eq('password', password)
      .single();

    // Kiểm tra nếu không tìm thấy người dùng
    if (error || !user) {
      // Tăng số lần đăng nhập sai
      loginAttempts[username].count += 1;

      // Kiểm tra nếu đạt 3 lần đăng nhập sai
      if (loginAttempts[username].count >= 3) {
        loginAttempts[username].lockedUntil = Date.now() + LOCK_TIME; // Khóa tài khoản
        return res.render('elearninglogin', { error: 'Tài khoản đã bị khóa do quá nhiều lần đăng nhập sai. Vui lòng thử lại sau 10 phút.', title: 'Đăng Nhập' });
      }

      return res.render('elearninglogin', { error: 'Tên đăng nhập hoặc mật khẩu không đúng.', title: 'Đăng Nhập' });
    }

    // Nếu là sinh viên, kiểm tra trạng thái tốt nghiệp
    if (!user.isAdmin) {
      const { data: graduationRecords, error: graduationError } = await supabase
        .from('graduation')
        .select('isgraduation')
        .eq('iduser', user.iduser);

      if (graduationError) {
        console.error('Error fetching graduation records:', graduationError);
        return res.render('elearninglogin', { error: 'Đã có lỗi xảy ra. Vui lòng thử lại.', title: 'Đăng Nhập' });
      }

      // Kiểm tra nếu tất cả các cột isgraduation đều là true
      const allGraduated = graduationRecords.every(record => record.isgraduation === true);

      if (allGraduated) {
        return res.render('elearninglogin', { error: 'Tài khoản đã bị khóa vì sinh viên đã tốt nghiệp tất cả các khóa.', title: 'Đăng Nhập' });
      }
    }

    // Đặt lại số lần đăng nhập sai nếu thành công
    loginAttempts[username] = { count: 0, lockedUntil: null };

    // Lưu thông tin user vào session
    req.session.user = user;

    // Render trang elearning cho sinh viên với iduser tương ứng
    return res.redirect(`/elearning/${user.iduser}`);
  } catch (error) {
    console.error(error);
    return res.render('elearninglogin', { error: 'Đã có lỗi xảy ra. Vui lòng thử lại.', title: 'Đăng Nhập' });
  }
});

app.get('/elearning/:iduser', isAuthenticated2, async (req, res) => {
  const userId = req.params.iduser;

  try {
      // Lấy thông tin người dùng từ bảng users
      const { data: user, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('iduser', userId)
          .single();

      if (userError) {
          return res.status(404).send('Người dùng không tồn tại');
      }

      // Lấy tất cả các lớp học mà iduser đang tham gia từ bảng classes
      const { data: classes, error: classesError } = await supabase
          .from('classes')
          .select('*')
          .eq('iduser', userId); // Lưu ý rằng trường này cần phải tồn tại trong bảng classes

      if (classesError) {
          console.error(classesError);
          return res.status(500).send('Đã xảy ra lỗi khi lấy danh sách lớp học');
      }

      //console.log(classes); // Kiểm tra dữ liệu lớp học

      // Lấy danh sách kỳ thi từ bảng exam cho các lớp học đã tham gia
      const { data: exams, error: examsError } = await supabase
          .from('exam')
          .select('*')
          .in('idclass', classes.map(classItem => classItem.idclass)); // Lấy danh sách idclass từ lớp học

      if (examsError) {
          console.error(examsError);
          return res.status(500).send('Đã xảy ra lỗi khi lấy danh sách kỳ thi');
      }

            // Lấy tất cả các đề tài thảo luận từ bảng topics
            const { data: topics, error: topicsError } = await supabase
            .from('topics')
            .select('*');
  
        if (topicsError) {
            console.error(topicsError);
            return res.status(500).send('Đã xảy ra lỗi khi lấy danh sách đề tài thảo luận');
        }
  

              // Lấy tất cả các thông báo từ bảng information cho các lớp mà sinh viên tham gia
      const { data: notifications, error: notificationsError } = await supabase
      .from('information')
      .select('*')
      .in('idclass', classes.map(classItem => classItem.idclass)); // Lấy thông báo theo idclass của sinh viên

  if (notificationsError) {
      console.error(notificationsError);
      return res.status(500).send('Đã xảy ra lỗi khi lấy thông báo');
  }

// Lấy dữ liệu mới nhất từ bảng commitstudy cho mỗi idclass mà sinh viên tham gia
const commitstudy = [];
for (const classItem of classes) {
    try {
        const { data: latestCommit, error: commitstudyError } = await supabase
            .from('commitstudy')
            .select('*')
            .eq('iduser', userId)
            .eq('idclass', classItem.idclass)
            .order('createdat', { ascending: false })
            .limit(1)
            .single();

        if (commitstudyError) {
            console.error(`Lỗi khi lấy cam kết học tập cho lớp ${classItem.idclass}:`, commitstudyError);
            continue; // Bỏ qua lỗi và tiếp tục với lớp tiếp theo
        }

        if (!latestCommit) {
            // Nếu không có cam kết, trả về thông báo chưa có dữ liệu cam kết
            commitstudy.push({
                idclass: classItem.idclass,
                message: 'Chưa có dữ liệu cam kết'
            });
        } else {
            commitstudy.push(latestCommit);
        }
    } catch (error) {
        console.error(`Lỗi ngoại lệ khi lấy cam kết học tập cho lớp ${classItem.idclass}:`, error);
    }
}


      // Gọi view elearning.ejs và truyền thông tin người dùng, lớp học, và kỳ thi
      return res.render('elearning', { user: user, topics: topics, classes: classes, exams: exams, notifications: notifications, commitstudy: commitstudy, title: 'E-Learning', view: 'classes' });

  } catch (err) {
      console.error(err);
      return res.status(500).send('Đã xảy ra lỗi');
  }
});

// Route để handle logout
app.get('/elearning-logout', (req, res) => {
  // Xóa session
  req.session.destroy((err) => {
      if (err) {
          console.error('Lỗi khi đăng xuất:', err);
          return res.redirect('/?error=logout_failed');
      }
      // Redirect về trang login
      res.redirect('/elearning-login');
  });
});


app.get('/api/topics', async (req, res) => {
  try {
      const { data: topics, error } = await supabase
          .from('topics')
          .select('topic_code, topic_name, deadline');

      if (error) {
          console.error('Error fetching topics:', error);
          return res.status(500).send('Server error');
      }

      res.json(topics);
  } catch (error) {
      console.error('Server error:', error);
      res.status(500).send('Server error');
  }
});

const { GoogleGenerativeAI } = require("@google/generative-ai");
const GEMINI_API_KEY = 'AIzaSyCef1vFxl-W-8Jq9_T271JjyGQpeqsYstI'; // Thay thế bằng API Key của bạn

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

app.post('/api/chat', async (req, res) => {
  const message = req.body.message;

  try {
      // Sử dụng phương thức generateContent từ model
      const result = await model.generateContent(message);

      // Kiểm tra kết quả và trả về phản hồi
      if (result.response && result.response.text()) {
          res.json({ reply: result.response.text() });
      } else {
          console.error("Unexpected API response format:", result);
          res.status(500).json({ error: "Unexpected API response format" });
      }
  } catch (error) {
      console.error("Error connecting to Gemini API:", error);

      // Kiểm tra mã lỗi và trả về thông báo cụ thể cho người dùng
      if (error.response && error.response.status === 503) {
          res.status(503).json({ error: "Dịch vụ không khả dụng. Vui lòng thử lại sau." });
      } else {
          // Gửi thông báo lỗi chung nếu không phải là lỗi 503
          res.status(500).json({ error: "Đã xảy ra lỗi khi kết nối với API. Vui lòng thử lại sau." });
      }
  }
});

//chu ky
// API lưu chữ ký
app.post('/save-signature', async (req, res) => {
  const { idclass, iduser, signatureData, timecommit } = req.body;

  try {
    // Tìm bản ghi có idclass và iduser, sau đó sắp xếp theo createdat giảm dần để lấy bản ghi có createdat mới nhất
    const { data: existingCommit, error: fetchError } = await supabase
      .from('commitstudy')
      .select('*')
      .eq('idclass', idclass)
      .eq('iduser', iduser)
      .order('createdat', { ascending: false })  // Sắp xếp giảm dần theo createdat
      .limit(1);  // Chỉ lấy bản ghi mới nhất

    if (fetchError) {
      throw fetchError;  // Nếu có lỗi trong truy vấn, ném lỗi
    }

    // Nếu có bản ghi, cập nhật chữ ký cho bản ghi có createdat mới nhất
    if (existingCommit.length > 0) {
      const { data, error } = await supabase
        .from('commitstudy')
        .update({ sign: signatureData })  // Cập nhật chữ ký mới
        .match({ idclass, iduser, createdat: existingCommit[0].createdat });  // Cập nhật bản ghi có createdat mới nhất

      if (error) {
        throw error;  // Nếu có lỗi trong quá trình cập nhật, ném lỗi
      }

      return res.status(200).send({ message: 'Chữ ký đã được cập nhật thành công!' });
    }

    // Nếu không có bản ghi, thực hiện chèn mới
    const { data, error } = await supabase
      .from('commitstudy')
      .insert([{
        idclass,
        iduser,
        sign: signatureData,  // Lưu chữ ký
        timecommit,  // Lưu thời gian cam kết (chuỗi)
      }]);

    if (error) {
      throw error;  // Nếu có lỗi trong quá trình chèn mới, ném lỗi
    }

    res.status(200).send({ message: 'Chữ ký đã được lưu thành công!' });

  } catch (error) {
    console.error('Lỗi khi lưu chữ ký:', error);
    res.status(500).send({ error: 'Không thể lưu chữ ký' });
  }
});

// API để lấy chữ ký của sinh viên cho lớp cụ thể
app.get('/get-signature', async (req, res) => {
  const { iduser, idclass } = req.query;

  try {
      // Truy vấn lấy chữ ký của sinh viên (dòng mới nhất)
      const { data, error } = await supabase
          .from('commitstudy')  // Kiểm tra tên bảng đúng
          .select('sign')  // Kiểm tra đúng trường chứa chữ ký (sign)
          .eq('iduser', iduser)
          .eq('idclass', idclass)
          .order('createdat', { ascending: false })
          .limit(1); // Chỉ lấy dòng mới nhất

      if (error) {
          return res.status(500).json({ error: error.message });
      }

      if (data.length > 0) {
          res.json({ signatureData: data[0].sign });  // Trả lại chữ ký từ trường 'sign'
      } else {
          res.json({ signatureData: null });  // Nếu không có chữ ký nào
      }
  } catch (err) {
      res.status(500).json({ error: err.message });
  }
});

// quan ly cam ket admin

// Route to display commitment page
app.get('/commitStudent', async (req, res) => {
  try {
      // Lấy danh sách iduser duy nhất từ bảng commitstudy
      let { data: allUsers, error: studentsError } = await supabase
          .from('commitstudy')
          .select('iduser')
          .order('iduser', { ascending: true });

      if (studentsError) throw studentsError;

      // Lọc bỏ các `iduser` trùng lặp
      const uniqueIds = Array.from(new Set(allUsers.map(user => user.iduser)));

      // Lấy tên đầy đủ (fullname) từ bảng users cho từng iduser duy nhất
      let { data: usersWithNames, error: namesError } = await supabase
          .from('users')
          .select('iduser, fullname')
          .in('iduser', uniqueIds);

      if (namesError) throw namesError;

      // Chuyển đổi thành danh sách người dùng với iduser và fullname
      const commitstudyUsers = usersWithNames.map(user => ({
          iduser: user.iduser,
          fullname: user.fullname
      }));

      // Lấy cam kết mới nhất cho từng iduser và idclass
      const recentCommitments = {};
      for (const user of commitstudyUsers) {
          let { data: latestCommitments, error: commitmentError } = await supabase
              .from('commitstudy')
              .select('iduser, idclass, sign, createdat')
              .eq('iduser', user.iduser)
              .order('createdat', { ascending: false });

          if (commitmentError) throw commitmentError;

          // Xử lý từng lớp học để lấy cam kết mới nhất
          latestCommitments.forEach(commit => {
              if (!recentCommitments[user.iduser]) {
                  recentCommitments[user.iduser] = {};
              }

              // Kiểm tra và lưu cam kết mới nhất cho mỗi lớp học (idclass)
              if (!recentCommitments[user.iduser][commit.idclass]) {
                  recentCommitments[user.iduser][commit.idclass] = commit.sign ? "Đã ký" : "Chưa ký";
              }
          });
      }

      res.render('commitStudent', { commitstudyUsers, recentCommitments });
  } catch (error) {
      console.error("Error fetching student commitments:", error);
      res.status(500).send("Lỗi khi lấy dữ liệu cam kết của sinh viên.");
  }
});





app.get('/admin/commitments/:iduser', async (req, res) => {
  const iduser = req.params.iduser;
  
  // Lấy tất cả cam kết của `iduser` và sắp xếp theo `idclass` và `createdat` (ngày mới nhất lên trên)
  let { data: allCommitments, error } = await supabase
    .from('commitstudy')
    .select('*')
    .eq('iduser', iduser)
    .order('idclass', { ascending: true })
    .order('createdat', { ascending: false });
  
  if (error) {
    console.error("Error fetching commitments:", error);
    return res.status(500).json({ error: "Lỗi khi lấy dữ liệu cam kết." });
  }

  // Lọc để chỉ giữ lại cam kết mới nhất cho mỗi `idclass`
  const recentCommitments = {};
  allCommitments.forEach(commit => {
    if (!recentCommitments[commit.idclass]) {
      recentCommitments[commit.idclass] = commit; // Chỉ giữ bản ghi mới nhất của mỗi lớp
    }
  });

  // Chuyển recentCommitments thành mảng để gửi về client
  res.json(Object.values(recentCommitments));
});


app.get('/detailcommit/:iduser/:idclass/:timecommit', async (req, res) => {
  try {
      const { iduser, idclass, timecommit } = req.params;
      
      // Fetch commitment data from Supabase
      let { data: commitment, error } = await supabase
          .from('commitstudy')
          .select('*')
          .eq('iduser', iduser)
          .eq('idclass', idclass)
          .eq('timecommit', timecommit)
          .single(); // Lấy bản ghi duy nhất
      
      if (error) {
          console.error("Error fetching commitment:", error);
          return res.status(500).send('Lỗi khi lấy dữ liệu cam kết');
      }

      if (!commitment) {
          return res.status(404).send('Không tìm thấy cam kết');
      }

      // Fetch fullname from the users table
      let { data: user, error: userError } = await supabase
          .from('users')
          .select('fullname')
          .eq('iduser', iduser)
          .single(); // Lấy bản ghi duy nhất theo iduser
      
      if (userError) {
          console.error("Error fetching user data:", userError);
          return res.status(500).send('Lỗi khi lấy thông tin người dùng');
      }

      // Fetch class name from the classes table (only one row for the given idclass)
      let { data: classData, error: classError } = await supabase
          .from('classes')
          .select('nameclass')
          .eq('idclass', idclass)
          .limit(1) // Chỉ lấy 1 bản ghi duy nhất
          .single(); // Lấy bản ghi duy nhất
      
      if (classError) {
          console.error("Error fetching class data:", classError);
          return res.status(500).send('Lỗi khi lấy thông tin lớp học');
      }

      // Render the page with all the necessary data
      res.render('detailcommit', {
          commitment,
          fullname: user ? user.fullname : 'Không có tên',
          className: classData ? classData.nameclass : 'Không có tên lớp',
          iduser, // Truyền iduser từ params
    idclass, // Truyền idclass từ params
    timecommit // Truyền timecommit từ params
      });
  } catch (error) {
      console.error('Error:', error);
      res.status(500).send('Internal Server Error');
  }
});
//quynh
app.get('/bequynh', (req, res) => {
  res.render('quynh2010');
});

app.use((req, res, next) => {
  res.status(404).render('404'); // Gọi tệp 404.ejs
});



const PORT = process.env.PORT || 3333;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
