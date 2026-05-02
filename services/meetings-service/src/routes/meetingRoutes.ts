import { Router, Request, Response } from 'express';
import Meeting from '../models/Meeting';

const router = Router();

router.get('/health', (_, res) => res.json({ status: 'ok', service: 'meetings-service' }));

// List meetings (optionally filter by month=YYYY-MM)
router.get('/', async (req: Request, res: Response) => {
  const tenantId = req.headers['x-tenant-id'] as string;
  if (!tenantId) return res.status(401).json({ message: 'Unauthorized' });

  try {
    const query: any = { tenantId };

    if (req.query.month) {
      const [year, month] = (req.query.month as string).split('-').map(Number);
      const start = new Date(year, month - 1, 1);
      const end = new Date(year, month, 0, 23, 59, 59);
      query.startTime = { $gte: start, $lte: end };
    }

    const meetings = await Meeting.find(query).sort({ startTime: 1 });
    res.json(meetings);
  } catch {
    res.status(500).json({ message: 'Error fetching meetings' });
  }
});

// Create meeting
router.post('/', async (req: Request, res: Response) => {
  const tenantId = req.headers['x-tenant-id'] as string;
  const userId = req.headers['x-user-id'] as string;
  if (!tenantId || !userId) return res.status(401).json({ message: 'Unauthorized' });

  try {
    const { title, description, startTime, endTime, location, attendees, customerId, customerName } = req.body;
    if (!title || !startTime || !endTime) {
      return res.status(400).json({ message: 'title, startTime, and endTime are required' });
    }

    const meeting = await Meeting.create({
      title,
      description,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      location,
      attendees: attendees || [],
      customerId,
      customerName,
      tenantId,
      createdBy: userId,
    });

    res.status(201).json(meeting);
  } catch (err: any) {
    res.status(400).json({ message: err.message || 'Error creating meeting' });
  }
});

// Update meeting
router.put('/:id', async (req: Request, res: Response) => {
  const tenantId = req.headers['x-tenant-id'] as string;
  if (!tenantId) return res.status(401).json({ message: 'Unauthorized' });

  try {
    const { id } = req.params;
    const update: any = {};
    const fields = ['title', 'description', 'startTime', 'endTime', 'location', 'attendees', 'status', 'customerId', 'customerName'];
    fields.forEach((f) => {
      if (req.body[f] !== undefined) {
        update[f] = f === 'startTime' || f === 'endTime' ? new Date(req.body[f]) : req.body[f];
      }
    });

    const meeting = await Meeting.findOneAndUpdate(
      { _id: id, tenantId },
      { $set: update },
      { new: true }
    );

    if (!meeting) return res.status(404).json({ message: 'Meeting not found' });
    res.json(meeting);
  } catch (err: any) {
    res.status(400).json({ message: err.message || 'Error updating meeting' });
  }
});

// Delete meeting
router.delete('/:id', async (req: Request, res: Response) => {
  const tenantId = req.headers['x-tenant-id'] as string;
  if (!tenantId) return res.status(401).json({ message: 'Unauthorized' });

  try {
    const meeting = await Meeting.findOneAndDelete({ _id: req.params.id, tenantId });
    if (!meeting) return res.status(404).json({ message: 'Meeting not found' });
    res.json({ message: 'Meeting deleted' });
  } catch {
    res.status(500).json({ message: 'Error deleting meeting' });
  }
});

export default router;
