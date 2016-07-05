"use strict"

const _ = require("lodash")
const shortid = require("shortid")

const deref = swagger => value => {
  if (_.has(value, "$ref")) {
    const derefed = _.get(swagger, value.$ref.substr(2).split("/"))
    return _.cloneDeepWith(derefed, deref(swagger))
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
      path => [`{keys:${shortid.generate()}}`, ...path])
    return [...properties, ...additionalProperties]
  } else if (schema.items) {
    return _.map(fromJsonSchema(schema.items), path => ["{integers}", ...path])
  } else {
    return [[]]
  }
}

module.exports = swagger => _(_.cloneDeepWith(swagger.paths, deref(swagger)))
  .flatMap((pathItem, path) => _.map(pathItem, (operation, method) => _.assign({path, method}, operation)))
  .transform((falcorModel, operation) => {
    const uri = operation.path
    const method = operation.method.toUpperCase()
    const uriPath = _(uri)
      .split("/")
      .slice(1)
      .map(segment => {
        return segment.startsWith("{") ? `{keys:${segment.substr(1)}` : segment 
      })
      .value()
    const schema = _.get(operation, "responses.200.schema", {})
    if (method === "GET") {
      if (schema) {
        const paths = _(fromJsonSchema(schema))
          .map(responsePath => ({
            uri,
            method,
            path: {
              uriPart: uriPath, 
              responsePart: responsePath, 
            },
            route: [...uriPath, ...responsePath],
          }))
          .value()
        falcorModel.push(...paths)
      }
    } else {
      // falcorModel.push(pathInModel)
    }
  }, [])
  .value()
