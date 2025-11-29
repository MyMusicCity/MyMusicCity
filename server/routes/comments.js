const express = require("express");
const router = express.Router();
const Comment = require("../models/Comment");
const Event = require("../models/Event");
const auth = require("../middleware/auth");

// GET comments for an event
router.get("/comments/:eventId", async (req, res) => {
  try {
    const comments = await Comment.find({ event: req.params.eventId })
      .populate("user", "username email")
      .sort({ createdAt: 1 });

    res.json(comments);
  } catch (err) {
    console.error("Get comments error:", err);
    res.status(500).json({ error: "Failed to fetch comments" });
  }
});

// POST a new comment
router.post("/comments", auth, async (req, res) => {
  try {
    const { eventId, text } = req.body;

    if (!eventId || !text)
      return res.status(400).json({ error: "Event ID and text required" });

    const eventExists = await Event.findById(eventId);
    if (!eventExists)
      return res.status(404).json({ error: "Event not found" });

    const newComment = await Comment.create({
      event: eventId,
      user: req.user.id,
      text,
    });

    await newComment.populate("user", "username email");

    res.status(201).json(newComment);
  } catch (err) {
    console.error("Create comment error:", err);
    res.status(500).json({ error: "Failed to create comment" });
  }
});

// DELETE a comment
router.delete("/comments/:id", auth, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);

    if (!comment) return res.status(404).json({ error: "Comment not found" });

    if (String(comment.user) !== String(req.user.id))
      return res.status(403).json({ error: "Not allowed" });

    await Comment.findByIdAndDelete(req.params.id);

    res.json({ deleted: true });
  } catch (err) {
    console.error("Delete comment error:", err);
    res.status(500).json({ error: "Failed to delete comment" });
  }
});

module.exports = router;
