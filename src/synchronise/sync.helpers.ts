import axios from 'axios';
import {countBy, cloneDeep} from 'lodash';
import * as check from 'check-types';


export async function getVocab(vocabUrl: string): Promise<any> {
  try {
    const response = await axios.get(vocabUrl);
    const vocab = response.data;
    return vocab;
  } catch (err) {
    throw new Error(`Failed to get Urban Obs Vocab. Reason: ${err.message}`);
  }
}


export function resultsToLogMessage(results): string {

  const counts = countBy(results);
  const msg = `Created: ${counts.created || 0}. Updated: ${counts.updated || 0}. Unchanged: ${counts.unchanged || 0}. Failed: ${counts.failed || 0}`;
  return msg;

}


export function nullPropertiesIfMissing(obj: any, nullableKeys: string[]): any {
  const nulledObj = cloneDeep(obj);
  nullableKeys.forEach((key) => {
    if (check.not.assigned(obj[key])) {
      nulledObj[key] = null;
    }
  });
  return nulledObj;
}


export function stripPrefixFromId(id: string): string {
  const [partA, partB] = id.split(':');
  if (partB) {
    return partB;
  } else {
    return partA;
  }
}
