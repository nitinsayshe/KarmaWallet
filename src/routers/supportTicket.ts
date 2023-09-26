import { Express, Router } from 'express';
import * as SupportTicketController from '../controllers/supportTicket';

const router = Router();
router.post('/', SupportTicketController.submitSupportTicket);
export default (app: Express) => app.use('/support-ticket', router);
