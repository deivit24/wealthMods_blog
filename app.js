// Init Variables and Packages
require('dotenv').config();
const express = require('express'),
  bodyParser = require('body-parser'),
  methodOverride = require('method-override'),
  expressSanitizer = require('express-sanitizer'),
  session = require('express-session'),
  flash = require('connect-flash'),
  mongoose = require('mongoose'),
  // connectDb = require('./DB/Connection');
  Port = process.env.Port || 3000,
  Host = '0.0.0.0',
  app = express();

var multer = require('multer');
var storage = multer.diskStorage({
  filename: function(req, file, callback) {
    callback(null, Date.now() + file.originalname);
  }
});
var imageFilter = function(req, file, cb) {
  // accept image files only
  if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/i)) {
    return cb(new Error('Only image files are allowed!'), false);
  }
  cb(null, true);
};
var upload = multer({ storage: storage, fileFilter: imageFilter });

var cloudinary = require('cloudinary');
cloudinary.config({
  cloud_name: 'dptksyqdf',
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});
// using body  parser

app.use(bodyParser.urlencoded({ extended: true }));
app.use(expressSanitizer());

// setting view engine for ejs and custom style sheet

app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(methodOverride('_method'));

app.locals.moment = require('moment');
app.use(
  require('express-session')({
    secret: 'Once again Rusty wins cutest dog!',
    resave: false,
    saveUninitialized: false
  })
);
// Set up Schema/Model Config
app.use(flash());
app.use(function(req, res, next) {
  res.locals.error = req.flash('error');
  res.locals.success = req.flash('success');
  next();
});
const pass = process.env.PASSWORD;
const uri = `mongodb+srv://wealthmods:${pass}@cluster0-nk4nd.mongodb.net/test?retryWrites=true&w=majority`;
// Create MongoDB + Mongoose Database
mongoose.set('useFindAndModify', false);
mongoose.connect(uri, {
  useNewUrlParser: true,
  useCreateIndex: true,
  useUnifiedTopology: true
});

mongoose.connection.on('connected', () => {
  console.log('Mongoose is connected');
});

let blogSchema = new mongoose.Schema({
  title: String,
  image: String,
  imageId: String,
  body: String,
  createdAt: { type: Date, default: Date.now }
});

let Blog = mongoose.model('Blog', blogSchema);

// RESTful ROUTES

// INDEX ROUTE
app.get('/', (req, res) => {
  res.redirect('/blogs');
});

app.get('/blogs', (req, res) => {
  Blog.find({}, (err, blogs) => {
    if (err) {
      console.log('error!');
    } else {
      res.render('index', { blogs: blogs });
    }
  });
});

// NEW ROUTE
app.get('/blogs/new', (req, res) => {
  res.render('new');
});

// CREATE ROUTE
app.post('/blogs', upload.single('image'), (req, res) => {
  cloudinary.v2.uploader.upload(req.file.path, function(err, result) {
    if (err) {
      req.flash('error', err.message);
      return res.redirect('back');
    }
    // add cloudinary url for the image to the campground object under image property
    req.body.blog.image = result.secure_url;
    // add image's public_id to campground object
    req.body.blog.imageId = result.public_id;
    req.body.blog.body = req.sanitize(req.body.blog.body);

    let data = req.body.blog;

    Blog.create(data, (err, newBlog) => {
      if (err) {
        req.flash('error', err.message);
        res.render('new');
      } else {
        req.flash('success', 'Successfully Created!');
        res.redirect('/blogs');
      }
    });
  });
});

// SHOW ROUTE
app.get('/blogs/:id', (req, res) => {
  let id = req.params.id;
  Blog.findById(id, (err, foundBlog) => {
    if (err) {
      console.log('error!');
      res.redirect('/blogs');
    } else {
      res.render('show', { blog: foundBlog });
    }
  });
});

// Edit ROUTE
app.get('/blogs/:id/edit', (req, res) => {
  let id = req.params.id;
  Blog.findById(id, (err, foundBlog) => {
    if (err) {
      console.log('error!');
      res.redirect('/blogs');
    } else {
      res.render('edit', { blog: foundBlog });
    }
  });
});

// UPDATE ROUTE
app.put('/blogs/:id', upload.single('image'), (req, res) => {
  Blog.findById(req.params.id, async function(err, blog) {
    if (err) {
      req.flash('error', err.message);
      res.redirect('back');
    } else {
      if (req.file) {
        try {
          await cloudinary.v2.uploader.destroy(blog.imageId);
          var result = await cloudinary.v2.uploader.upload(req.file.path);
          blog.imageId = result.public_id;
          blog.image = result.secure_url;
        } catch (err) {
          req.flash('error', err.message);
          return res.redirect('back');
        }
      }
      blog.title = req.body.blog.title;
      blog.body = req.sanitize(req.body.blog.body);
      blog.save();
      req.flash('success', 'Successfully Updated!');
      res.redirect('/blogs/' + blog._id);
    }
  });
});
// app.put('/blogs/:id', (req, res) => {
//   req.body.blog.body = req.sanitize(req.body.blog.body);
//   let id = req.params.id;
//   Blog.findByIdAndUpdate(id, req.body.blog, (err, updatedBlog) => {
//     if (err) {
//       res.redirect('/blogs');
//     } else {
//       res.redirect('/blogs/' + id);
//     }
//   });
// });

// DESTROY/DELETE Route
app.delete('/blogs/:id', (req, res) => {
  Blog.findById(req.params.id, async function(err, blog) {
    if (err) {
      req.flash('error', err.message);
      return res.redirect('back');
    }
    try {
      await cloudinary.v2.uploader.destroy(blog.imageId);
      blog.remove();
      req.flash('success', 'Blog Post deleted successfully!');
      res.redirect('/blogs');
    } catch (err) {
      if (err) {
        req.flash('error', err.message);
        return res.redirect('back');
      }
    }
  });
});

app.listen(Port, Host, () => {
  console.log('server is running');
});
