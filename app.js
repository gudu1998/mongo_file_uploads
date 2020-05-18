const express = require('express')
const bodyParser = require('body-parser')
const path = require('path')
const crypto = require('crypto')
const mongoose = require('mongoose')
const multer = require('multer')
const GridFsStorage = require('multer-gridfs-storage')
const Grid = require('gridfs-stream')
const methodOverride = require('method-override')

const app = express()

// Middleware
// support parsing of application/json type post data
app.use(bodyParser.json());
app.use(methodOverride('_method'));
app.set('view engine','ejs')

// MongoURI
const mongoURI = "mongodb+srv://gudu1998:ab828066@cluster0-lliyd.mongodb.net/mongouploads"

// create mongo connection
const conn = mongoose.createConnection(mongoURI,{useNewUrlParser:true,useUnifiedTopology: true })

// init gfs
let gfs

conn.once('open', ()=> {
    // Init stream
     gfs = Grid(conn.db, mongoose.mongo);
     gfs.collection('uploads')
  })

//   Create Storage Engine
const storage = new GridFsStorage({
    url: mongoURI,
    file: (req, file) => {
      return new Promise((resolve, reject) => {
        crypto.randomBytes(16, (err, buf) => {
          if (err) {
            return reject(err);
          }
          const filename = buf.toString('hex') + path.extname(file.originalname);
          const fileInfo = {
            filename: filename,
            bucketName: 'uploads'
          };
          resolve(fileInfo);
        });
      });
    }
  });
  const upload = multer({ storage });

//   @route GET /
// @desc Loads form
app.get('/',(req,res)=>{
  gfs.files.find().toArray((err,files)=>{
    // checks if files
    if(!files || files.length == 0){
      res.render('index',{files:false})
    }else{
      files.map((file)=>{
        if(file.contentType == 'image/jpeg' || file.contentType == 'image/png'){
          file.isImage = true
        }else{
          file.isImage = false
        }
      })
      res.render('index',{files:files})
    }   
})
})

//  @route POST /upload
//  @desc uploads file to DB
app.post('/upload',upload.single('file'),(req,res)=>{
  // console.log(req.file)
  res.redirect('/')

})

// @route GET /files
// @desc display all files in json
app.get('/files',(req,res)=>{
  gfs.files.find().toArray((err,files)=>{
    // checks if files
    if(!files || files.length == 0){
      return res.status(404).json({
        err:'No files Exist'
      })
    }
  
    //Files exist
    return res.json(files) 
  })
})

// @route GET /files/:filename
// @desc display single file object
app.get('/files/:filename',(req,res)=>{
  gfs.files.findOne({filename:req.params.filename},(err,file)=>{
    // checks if files
    if(!file || file.length == 0){
      return res.status(404).json({
        err:'No file Exists'
      })
    }
  
    //Files exist
    return res.json(file) 
  })
})

// @route GET /image/:filename
// @desc Display Image
app.get('/image/:filename',(req,res)=>{
  gfs.files.findOne({filename:req.params.filename},(err,file)=>{
    // checks if file
    if(!file || file.length == 0){
      return res.status(404).json({
        err:'No file Exists'
      })
    }

    // Check if image
    if(file.contentType == 'image/jpeg' || file.contentType == 'image/png'){
      const readstream = gfs.createReadStream(file.filename)
       readstream.pipe(res);
    }else{
      res.status(404).json({
        err:'Not an Image'
      })
    }
  })  
})

// @route DELETE /files/:id
// @desc Delete File
app.delete('/files/:id',(req,res)=>{
  gfs.remove({_id:req.params.id,root:'uploads'},(err,GridFSBucket)=>{
    if(err){
      return res.status(404).json({err:err})
    }

    res.redirect('/')
  })
})
     

app.listen(5000,()=> console.log('Server Started on port 5000'))