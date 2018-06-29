module.exports = {
  "globDirectory": "public/",
  "globPatterns": [
    "**/*.{js,ico,html,json,css}",
    //taking images only from inages folder
    "src/images/*.{jpg,png}"
  ],
  "swSrc": "public/sw-base.js",
  "swDest": "public/sw.js",
  "globIgnores": [
    "../public/workbox-config.js",
    "help/**",
    "404.html"
  ]
};