import * as joi from '@hapi/joi';


export const vocabUnitSchema = joi.object({
  '@id': joi.string().required(),
  '@type': joi.string().valid('uo:Unit').required(),
  label: joi.string().required(),
  symbol: joi.string(),
  comment: joi.string(),
  sameAs: joi.array().items(joi.string()),
  term_status: joi.string()
})
.unknown() // we'll allow extra properties so we don't error everytime someone else decides to add some strange new property
.required();


export const vocabObservablePropertySchema = joi.object({
  '@id': joi.string().required(),
  '@type': joi.string().valid('sosa:ObservableProperty').required(),
  label: joi.string().required(),
  comment: joi.string(),
  recommendedUnits: joi.array().items(joi.string()),
  sameAs: joi.array().items(joi.string()),
  term_status: joi.string()
})
.unknown() // we'll allow extra properties so we don't error everytime someone else decides to add some strange new property
.required();


export const vocabDisciplineSchema = joi.object({
  '@id': joi.string().required(),
  '@type': joi.string().valid('uo:Discipline').required(),
  label: joi.string().required(),
  comment: joi.string(),
  sameAs: joi.array().items(joi.string()),
  term_status: joi.string()
})
.unknown() // we'll allow extra properties so we don't error everytime someone else decides to add some strange new property
.required();