import { Router, Response } from "express";
import { authenticate, AuthRequest, authorize } from "../middleware/auth";
import { pool } from "../config/db";

const router = Router();

// GET /api/users - List all users (admin only)
router.get(
  "/",
  authenticate,
  authorize("admin"),
  async (req: AuthRequest, res: Response) => {
    try {
      const result = await pool.query(
        "SELECT id, email, name, role, avatar, bio, created_at FROM users ORDER BY created_at DESC",
      );
      const users = result.rows.map((row) => ({
        id: row.id,
        email: row.email,
        displayName: row.name,
        role: row.role,
        photoURL: row.avatar,
        bio: row.bio,
        createdAt: row.created_at,
      }));
      res.json(users);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
);

// GET /api/users/:id - Get user profile
router.get("/:id", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      "SELECT id, email, name, role, avatar, bio, created_at FROM users WHERE id = $1",
      [req.params.id],
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }
    const row = result.rows[0];
    const user = {
      id: row.id,
      email: row.email,
      displayName: row.name,
      role: row.role,
      photoURL: row.avatar,
      bio: row.bio,
      createdAt: row.created_at,
    };
    res.json(user);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/users/:id - Update user profile
router.put("/:id", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { displayName, bio, photoURL, role } = req.body;

    // Only admin can update role
    if (role && req.user?.role !== "admin") {
      return res
        .status(403)
        .json({ error: "Only admins can update user roles" });
    }

    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (displayName !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(displayName);
    }
    if (bio !== undefined) {
      updates.push(`bio = $${paramIndex++}`);
      values.push(bio);
    }
    if (photoURL !== undefined) {
      updates.push(`avatar = $${paramIndex++}`);
      values.push(photoURL);
    }
    if (role !== undefined) {
      updates.push(`role = $${paramIndex++}`);
      values.push(role);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: "No fields to update" });
    }

    values.push(req.params.id);

    const result = await pool.query(
      `UPDATE users
       SET ${updates.join(", ")}
       WHERE id = $${paramIndex}
       RETURNING id, email, name, role, avatar, bio, created_at`,
      values,
    );

    const row = result.rows[0];
    const user = {
      id: row.id,
      email: row.email,
      displayName: row.name,
      role: row.role,
      photoURL: row.avatar,
      bio: row.bio,
      createdAt: row.created_at,
    };
    res.json(user);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/users/:id - Delete user (admin only)
router.delete(
  "/:id",
  authenticate,
  authorize("admin"),
  async (req: AuthRequest, res: Response) => {
    try {
      const targetId = Number.parseInt(req.params.id, 10);
      if (!Number.isFinite(targetId)) {
        return res.status(400).json({ error: "Invalid user id" });
      }
      if (targetId === req.user!.id) {
        return res
          .status(400)
          .json({ error: "Admins cannot delete their own account" });
      }
      const result = await pool.query(
        "DELETE FROM users WHERE id = $1 RETURNING id",
        [targetId],
      );
      if (result.rowCount === 0) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json({ message: "User deleted" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
);

export default router;
