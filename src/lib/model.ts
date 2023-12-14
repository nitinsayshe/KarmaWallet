import { UpdateQuery, UpdateWithAggregationPipeline, QueryOptions, Callback } from 'mongoose';

export interface ISaveableDocument {
  save: () => Promise<this>;
}
export interface IUpdateableDocument {
  update: (update?: UpdateQuery<this> | UpdateWithAggregationPipeline, options?: QueryOptions | null, callback?: Callback) => Promise<this>;
}

export const updateDocumentWithUpsert = async (document: IUpdateableDocument): Promise<IUpdateableDocument> => {
  try {
    if (!document?.update) {
      throw new Error('Document does not have an update method');
    }
    return await document.update(document, { upsert: true });
  } catch (err) {
    console.error(err);
  }
};
export const saveDocument = async (document: ISaveableDocument): Promise<ISaveableDocument> => {
  try {
    if (!document?.save) {
      throw new Error('Document does not have a save method');
    }
    return await document.save();
  } catch (err) {
    console.error(err);
  }
};

export const updateDocumentsWithUpsert = async (documents: IUpdateableDocument[]): Promise<IUpdateableDocument[]> => Promise.all(documents.map(async (d) => updateDocumentWithUpsert(d)));
export const saveDocuments = async (documents: ISaveableDocument[]): Promise<ISaveableDocument[]> => Promise.all(documents.map(async (d) => saveDocument(d)));

export interface IRemoveableDocument {
  remove: () => Promise<this>;
}

export const cleanUpDocument = async (document: IRemoveableDocument) => {
  try {
    if (!document?.remove) {
      throw new Error('Document does not have a remove method');
    }
    return await document.remove();
  } catch (err) {
    console.error(err);
  }
};

export const cleanUpDocuments = async (document: IRemoveableDocument[]) => Promise.all(
  document.map(async (d) => {
    await cleanUpDocument(d);
  }),
);
