const _ = require("lodash")
const request = require("request-promise")
const server = require("./server")
const swagger = require("./petstore.swagger.json")
const routeDefinitions = require("./falcorized")(swagger)

function render(template, vars) {
  return _.template(template, {interpolate: /{([\S]+)}/})(vars)
}

const routes = _.map(routeDefinitions, routeDefinition => ({
  route: routeDefinition.route.join(`.`).replace(/\.({[^{}]+})/g, `[$1]`),
  get: pathSet => {
    const uri = render(routeDefinition.uri, pathSet)
    const responsePath = render(routeDefinition.path.responsePart, pathSet)
    console.log("request:", uri)
    return request({uri, method: "GET", baseUrl: "http://" + swagger.host + swagger.basePath, json: true}).then(response => {
      console.log("response:", response)
      return [{path: pathSet, value: _.get(response, responsePath)}]
    }).catch(err => {
      console.log(err)
      throw err
    })
  },
}))

console.log(JSON.stringify(routeDefinitions, null, 2))
console.log(routes)

server(routes).listen(9039, () => console.log("server started"))