const FalcorRouter = require("falcor-router")
const falcorExpress = require("falcor-express")
const bodyParser = require("body-parser")
const express = require("express")

module.exports = routes => {
  const app = express()
  app.use(bodyParser.json())
  app.use(bodyParser.urlencoded({extended: false}))

  app.get("/model.json", falcorExpress.dataSourceRoute(() => {
    return new FalcorRouter(routes)
  }))

  return app
}