// controllers/testimonialController.js
const Testimonial = require('../models/Testimonial');

exports.getAllTestimonials = async (req, res, next) => {
  try {
    // Optionally allow ?limit=6 or ?sort=order_desc
    const limit = parseInt(req.query.limit, 10) || 0;
    const sortQuery = req.query.sort === 'order_desc' ? { order: -1 } : { order: 1 };

    const query = Testimonial.find()
      .select('name domain feedback avatar company role location duration rating order -_id')
      .sort(sortQuery);

    if (limit > 0) query.limit(limit);

    const testimonials = await query.exec();
    res.json(testimonials);
  } catch (err) {
    next(err);
  }
};