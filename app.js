const express = require("express")
const app = express()
const sanitizeHTML = require("sanitize-html")
const jwt = require("jsonwebtoken")
const axios = require('axios')
const helmet = require('helmet');

app.use(express.urlencoded({ extended: false }))
app.use(express.json())

app.use("/", require("./router"))

const server = require("http").createServer(app)
const io = require("socket.io")(server, {
  pingTimeout: 30000,
  cors: true
})

io.on("connection", function(socket) {
  socket.on("chatFromBrowser", function(data) {
    try {
      let user = jwt.verify(data.token, process.env.JWTSECRET)
      socket.broadcast.emit("chatFromServer", { message: sanitizeHTML(data.message, { allowedTags: [], allowedAttributes: {} }), username: user.username, avatar: user.avatar })
    } catch (e) {
      console.log("Not a valid token for chat.")
    }
  })
})

// Define a route to proxy Gravatar images
app.get('/proxy-gravatar', async (req, res) => {
  try {
    const gravatarUrl = req.query.url; // Get the Gravatar URL from the query parameters
    const response = await axios.get(gravatarUrl, { responseType: 'arraybuffer' });

    res.set('Content-Type', response.headers['content-type']);
    res.send(response.data);
  } catch (error) {
    res.status(500).send('Error fetching Gravatar image');
  }
});

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      // Add other directives as needed
      "default-src": ["'self'"],
      "img-src": [
        "'self'",
        "http://localhost:3000", // Allow images from your own server
        "https://secure.gravatar.com", // Allow images directly from Gravatar
        // Include any other domains you serve content from
      ],
      // You may need to adjust other directives as well, depending on your app's needs
    },
  },
}));

module.exports = server
