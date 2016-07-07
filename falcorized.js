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

function fromUri(uri) {
  return _(uri)
    .split("/")
    .slice(1)
    .map(segment => segment.startsWith("{") ? `{keys:${segment.substr(1)}` : segment)
    .value()
}

function fromParameters(parameters) {
  return _(parameters)
    .filter({required: true, type: "string", in: "query"})
    .map(({name}) => `{keys:${name}}`)
    .value()
}

module.exports = swagger => _(_.cloneDeepWith(swagger.paths, deref(swagger)))
  .flatMap((pathItem, path) => _.map(pathItem, (operation, method) => _.assign({path, method}, operation)))
  .transform((falcorModel, operation) => {
    const uri = operation.path
    const method = operation.method.toUpperCase()
    const uriPath = fromUri(uri)
    const parameters = _.get(operation, "parameters", [])
    const schema = _.get(operation, "responses.200.schema", {})
    if (method === "GET") {
      const pathForParameters = fromParameters(parameters)
      if (schema) {
        const paths = _(fromJsonSchema(schema))
          .map(responsePath => ({
            uri,
            method,
            path: {
              uriPart: uriPath,
              responsePart: responsePath,
            },
            parameters,
            route: [...uriPath, ...pathForParameters, ...responsePath],
          }))
          .value()
        falcorModel.push(...paths)
      } else {
        falcorModel.push(uriPath)
      }
    } else {
      // falcorModel.push(pathInModel)
    }
  }, [])
  .value()
