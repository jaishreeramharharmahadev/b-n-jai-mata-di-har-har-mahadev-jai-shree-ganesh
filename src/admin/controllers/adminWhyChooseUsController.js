const WhyChooseUs = require("../../models/WhyChooseUs");

exports.getWhyChooseUs = async (req, res) => {
  try {
    const data = await WhyChooseUs.find().sort({ createdAt: -1 });

    return res.status(200).json({
      status: "success",
      data,
    });

  } catch (error) {
    console.error("WhyChooseUs Fetch Error:", error);
    res.status(500).json({ message: error.message });
  }
};

exports.createWhyChooseUs = async (req, res) => {
  try {
    const newItem = await WhyChooseUs.create(req.body);

    res.status(201).json({
      message: "New WhyChooseUs item added successfully",
      data: newItem,
    });

  } catch (error) {
    console.error("WhyChooseUs Create Error:", error);
    res.status(500).json({ message: error.message });
  }
};

exports.updateWhyChooseUs = async (req, res) => {
  try {
    const { id } = req.params;

    const updated = await WhyChooseUs.findByIdAndUpdate(id, req.body, {
      new: true,
    });

    if (!updated)
      return res.status(404).json({ message: "Item not found" });

    res.status(200).json({
      message: "Item updated successfully",
      data: updated,
    });

  } catch (error) {
    console.error("WhyChooseUs Update Error:", error);
    res.status(500).json({ message: error.message });
  }
};

exports.deleteWhyChooseUs = async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = await WhyChooseUs.findByIdAndDelete(id);

    if (!deleted)
      return res.status(404).json({ message: "Item not found" });

    res.status(200).json({ message: "Item deleted successfully" });

  } catch (error) {
    console.error("WhyChooseUs Delete Error:", error);
    res.status(500).json({ message: error.message });
  }
};