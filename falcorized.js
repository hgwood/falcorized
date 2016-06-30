"use strict"

const _ = require("lodash")
const swagger = require("./petstore.swagger.json")

module.exports.deref = value => {
  if (_.has(value, "$ref")) return _.cloneDeepWith(_.get(swagger, value.$ref.substr(2).split("/")), module.exports.deref)
}
const derefedSwagger = _.cloneDeepWith(swagger, module.exports.deref)
// exports.ds = derefedSwagger
// console.log(derefedSwagger)

const falcorModel = []

function fromJsonSchema(schema) {
  schema = schema || {}
  if (schema.type === "object") {
    const properties = _.flatMap(schema.properties, (propertySchema, propertyName) => {
      return _.map(
        fromJsonSchema(propertySchema),
        path => [propertyName, ...path])
    })
    const additionalProperties = _.map(
      fromJsonSchema(schema.additionalProperties),
      path => ["{keys}", ...path])
    return [...properties, ...additionalProperties]
  } else if (schema.items) {
    return _.map(fromJsonSchema(schema.items), path => ["{integers}", ...path])
  } else {
    return [[]]
  }
}

_(derefedSwagger.paths)
  .flatMap((pathItem, path) => _.map(pathItem, (operation, method) => _.assign({path, method}, operation)))
  // .tap(console.log)
  .forEach(operation => {
    const pathInModel = operation.path.split("/").slice(1)
    const schema = _.get(operation, "responses.200.schema", {})
    if (operation.method === "get") {
      if (schema) {
        const paths = _.map(fromJsonSchema(schema), path => [...pathInModel, ...path])
          .map(path => _.assign({}, path, {get: true}))
        falcorModel.push(...paths)
      }
    } else {
      // falcorModel.push(pathInModel)
    }
  })

console.log(JSON.stringify(falcorModel, null, 2))