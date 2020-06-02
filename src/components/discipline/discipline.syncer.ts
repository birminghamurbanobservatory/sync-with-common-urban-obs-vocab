import {getVocab, resultsToLogMessage, stripPrefixFromId} from '../../synchronise/sync.helpers';
import {config} from '../../config';
import * as logger from 'node-logger';
import {pick, isEqual} from 'lodash';
import * as Promise from 'bluebird';
import * as joi from '@hapi/joi';
import {getDiscipline, updateDiscipline, createDiscipline} from './discipline.service';


const vocabDisciplineSchema = joi.object({
  '@id': joi.string().required(),
  '@type': joi.string().valid('uo:Discipline').required(),
  label: joi.string().required(),
  description: joi.string(),
  sameAs: joi.array().items(joi.string()),
  term_status: joi.string()
})
.unknown() // we'll allow extra properties so we don't error everytime someone else decides to add some strange new property
.required();


export async function syncDisciplines(): Promise<void> {

  const url = `${config.vocab.baseUrl}/disciplines.json`;
  const vocab = await getVocab(url);
  const definitions = vocab.defines;

  const results = await Promise.map(definitions, async (definition) => {
    try {
      // First check it is valid
      const {error: err} = vocabDisciplineSchema.validate(definition);
      if (err) throw err;
      // The parse it
      const parsed = parseDiscipline(definition);
      // Then sync it
      const result = await syncDiscipline(parsed);
      return result;
    } catch (err) {
      logger.error(`Failed to sync discipline '${definition.id}' (${err.message})`);
      return 'failed';
    }
  });

  logger.info(`Disciplines. ${resultsToLogMessage(results)}`);

  return;

}


function parseDiscipline(discipline: any): any {
  const parsed = {
    id: stripPrefixFromId(discipline['@id']),
    label: discipline.label,
    description: discipline.description || '',
    listed: true,
    inCommonVocab: true
  };
  return parsed;
}


async function syncDiscipline(discipline: any): Promise<string> {

  // First let's see if it already exists
  let current;
  try {
    current = await getDiscipline(discipline.id);
  } catch (err) {
    if (err.name !== 'DisciplineNotFound') throw err;
  }

  if (current) {

    // Has there been any updates?
    const comparableKeys = ['label', 'description'];
    const comparableNew = pick(discipline, comparableKeys);
    const comparableCurrent = pick(current, comparableKeys);
    if (isEqual(comparableCurrent, comparableNew)) {
      return 'unchanged';

    } else {
      // Update it
      logger.debug(`Discipline '${discipline.id}' no longer exactly matches the vocab definition, and therefore needs updating.`, {
        uoVersion: comparableNew,
        buoVersion: comparableCurrent
      });
      const updates = comparableNew;
      await updateDiscipline(discipline.id, updates);
      return 'updated';

    }

  } else {
    // Create new record
    await createDiscipline(discipline);
    return 'created';
  }

}


