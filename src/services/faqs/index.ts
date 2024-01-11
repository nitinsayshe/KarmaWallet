import { ErrorTypes } from '../../lib/constants';
import CustomError, { asCustomError } from '../../lib/customError';
import { FAQLocation, FAQModel, FAQSubject } from '../../models/faq';
import { IRequest } from '../../types/request';

export interface ICreateFAQRequestBody {
  answer: string;
  location: FAQLocation[];
  question: string;
  subject: FAQSubject;
}

export interface IGetFAQParams {
  faqID: string;
}

export const getFAQs = async (_req: IRequest) => {
  const faqs = await FAQModel.find({});
  if (!faqs.length) throw new CustomError('There are no FAQs.', ErrorTypes.NOT_FOUND);
  return faqs;
};

export const createFAQ = async (req: IRequest<{}, {}, ICreateFAQRequestBody>) => {
  const { answer, location, question, subject } = req.body;

  if (!answer) throw new CustomError('Answer text is required.', ErrorTypes.INVALID_ARG);
  if (!location.length) throw new CustomError('A location is required.', ErrorTypes.INVALID_ARG);
  if (!question) throw new CustomError('Question text is required.', ErrorTypes.INVALID_ARG);
  if (!subject) throw new CustomError('A subject is required.', ErrorTypes.INVALID_ARG);

  if (location.length > 1 && !location.includes(FAQLocation.cardApplication) && !location.includes(FAQLocation.webApplication)) {
    throw new CustomError('The location you provided is not a valid option.', ErrorTypes.INVALID_ARG);
  }

  if (!Object.values(FAQSubject).includes(subject)) {
    throw new CustomError('The subject you provided is not a valid option.', ErrorTypes.INVALID_ARG);
  }

  try {
    const faq = new FAQModel({
      answer,
      location,
      question,
      subject,
    });

    faq.save();
    return faq;
  } catch (err) {
    throw asCustomError(err);
  }
};

export const updateFAQ = async (req: IRequest<IGetFAQParams, {}, ICreateFAQRequestBody>) => {
  const { faqID } = req.params;
  const { answer, location, question, subject } = req.body;

  if (!answer) throw new CustomError('Answer text is required.', ErrorTypes.INVALID_ARG);
  if (!location.length) throw new CustomError('A location is required.', ErrorTypes.INVALID_ARG);
  if (!question) throw new CustomError('Question text is required.', ErrorTypes.INVALID_ARG);
  if (!subject) throw new CustomError('A subject is required.', ErrorTypes.INVALID_ARG);

  if (location.length > 1 && !location.includes(FAQLocation.cardApplication) && !location.includes(FAQLocation.webApplication)) {
    throw new CustomError('The location you provided is not a valid option.', ErrorTypes.INVALID_ARG);
  }

  if (!Object.values(FAQSubject).includes(subject)) {
    throw new CustomError('The subject you provided is not a valid option.', ErrorTypes.INVALID_ARG);
  }

  try {
    const faq = await FAQModel.findById(faqID);
    if (!faq) throw new CustomError(`No FAQ with id ${faqID} was found.`, ErrorTypes.NOT_FOUND);

    faq.answer = answer;
    faq.location = location;
    faq.question = question;
    faq.subject = subject;
    faq.lasModified = new Date();

    faq.save();
    return faq;
  } catch (err) {
    throw asCustomError(err);
  }
};
