const _ = require("lodash")
const request = require("request-promise")
const server = require("./server")
const swagger = require("./petstore.swagger.json")
const routeDefinitions = require("./falcorized")(swagger)
const expand = require("./expand")

function render(template, vars) {
  return _.template(template, {interpolate: /{([\S]+)}/})(vars)
}

const routes = _.map(routeDefinitions, routeDefinition => ({
  route: routeDefinition.route.join(`.`).replace(/\.({[^{}]+})/g, `[$1]`),
  get: pathSet => {
    return Promise.all(_.map(expand.preservingShortcuts(pathSet), path => {
      const uri = render(routeDefinition.uri, path)
      const responsePath = render(routeDefinition.path.responsePart, path)
      const qs = _(routeDefinition.parameters).keyBy("name").mapValues(({name}) => _.get(pathSet, [name, 0])).compact().value()
      console.log("request:", uri, qs)
      return request({uri, method: "GET", baseUrl: "http://" + swagger.host + swagger.basePath, json: true, qs}).then(response => {
        console.log("response:", response)
        const value = _.get(response, responsePath)
        return {path: path, value: value || {$type: "atom", value: response}}
      }).catch(err => {
        console.log(err)
        throw err
      })
    }))
  },
}))

console.log(JSON.stringify(routeDefinitions, null, 2))
console.log(routes)

server(routes).listen(9039, () => console.log("server started"))