import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { sendEmail } from '../mailer';
import EmailLog from '../models/EmailLog';

const router = Router();

const SendEmailSchema = z.object({
  to: z.string().email(),
  toName: z.string().optional(),
  subject: z.string().min(1),
  body: z.string().min(1),
});

router.post('/send', async (req: Request, res: Response) => {
  const tenantId = req.headers['x-tenant-id'] as string;
  const userId = req.headers['x-user-id'] as string;

  if (!tenantId || !userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const { to, toName, subject, body } = SendEmailSchema.parse(req.body);

    let status: 'sent' | 'failed' = 'sent';
    let errorMessage: string | undefined;
    let previewUrl: string | undefined;

    try {
      const result = await sendEmail({ to, toName, subject, body });
      previewUrl = result.previewUrl;
    } catch (err: any) {
      status = 'failed';
      errorMessage = err.message;
    }

    const log = await EmailLog.create({
      to,
      toName,
      subject,
      body,
      tenantId,
      sentBy: userId,
      status,
      errorMessage,
    });

    if (status === 'failed') {
      return res.status(500).json({ message: 'Failed to send email', error: errorMessage });
    }

    res.status(200).json({ message: 'Email sent successfully', id: log.id, previewUrl });
  } catch (err: any) {
    res.status(400).json({ message: err.message || 'Invalid request' });
  }
});

router.get('/history', async (req: Request, res: Response) => {
  const tenantId = req.headers['x-tenant-id'] as string;
  if (!tenantId) return res.status(401).json({ message: 'Unauthorized' });

  try {
    const logs = await EmailLog.find({ tenantId }).sort({ createdAt: -1 }).limit(200);
    res.json(logs);
  } catch {
    res.status(500).json({ message: 'Error fetching email history' });
  }
});

export default router;
