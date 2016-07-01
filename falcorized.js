"use strict"

const _ = require("lodash")
const swagger = require("./petstore.swagger.json")

function deref(value) {
  if (_.has(value, "$ref")) {
    const derefed = _.get(swagger, value.$ref.substr(2).split("/"))
    return _.cloneDeepWith(derefed, deref)
  }
}

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

const falcorModel = _(_.cloneDeepWith(swagger.paths, deref))
  .flatMap((pathItem, path) => _.map(pathItem, (operation, method) => _.assign({path, method}, operation)))
  .transform((falcorModel, operation) => {
    const uri = operation.path
    const pathPrefix = _(uri).split("/").slice(1).map(segment => {
      return segment.startsWith("{") ? `{keys:${segment.substr(1)}` : segment 
    }).value()
    const schema = _.get(operation, "responses.200.schema", {})
    if (operation.method === "get") {
      if (schema) {
        const paths = _.map(fromJsonSchema(schema), path => [...pathPrefix, ...path])
          .map(path => _.assign({}, path, {get: true}))
        falcorModel.push(...paths)
      }
    } else {
      // falcorModel.push(pathInModel)
    }
  }, [])

console.log(JSON.stringify(falcorModel, null, 2))