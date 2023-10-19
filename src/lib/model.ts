export interface ISaveableDocument {
  save: () => Promise<this>;
}

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
