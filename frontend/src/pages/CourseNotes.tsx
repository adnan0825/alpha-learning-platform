/**
 * Student Course Notes
 * Uses real backend notes API
 */
import React, { useEffect, useState } from "react";
import { notesAPI, enrollmentsAPI, CourseNote as CourseNoteType, Enrollment } from "@/lib/api";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import { StickyNote, Plus, Trash2, Search, BookOpen, Edit2, Save, X, RefreshCw } from "lucide-react";

const CourseNotes: React.FC = () => {
  const [notes, setNotes] = useState<CourseNoteType[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [newNote, setNewNote] = useState("");
  const [selectedCourse, setSelectedCourse] = useState<string>("");
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [notesData, enrollmentsData] = await Promise.all([
        notesAPI.getAll(),
        enrollmentsAPI.getMyCourses(),
      ]);
      setNotes(notesData);
      setEnrollments(enrollmentsData);
      if (enrollmentsData.length > 0) {
        setSelectedCourse(enrollmentsData[0].courseId);
      }
    } catch (err) {
      console.error("Failed to load notes or enrollments:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim() || !selectedCourse) return;
    setSaving(true);
    try {
      const note = await notesAPI.create(selectedCourse, newNote);
      setNotes(prev => [note, ...prev]);
      setNewNote("");
      setShowAdd(false);
    } catch (err) {
      console.error("Failed to create note:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteNote = async (id: string) => {
    try {
      await notesAPI.delete(id);
      setNotes(prev => prev.filter(n => n.id !== id));
    } catch (err) {
      console.error("Failed to delete note:", err);
    }
  };

  const handleStartEdit = (note: CourseNoteType) => {
    setEditingId(note.id);
    setEditContent(note.content);
  };

  const handleSaveEdit = async (id: string) => {
    if (!editContent.trim()) return;
    setSaving(true);
    try {
      const updated = await notesAPI.update(id, editContent);
      setNotes(prev => prev.map(n => n.id === id ? updated : n));
      setEditingId(null);
    } catch (err) {
      console.error("Failed to update note:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditContent("");
  };

  const filtered = notes.filter(n =>
    n.content.toLowerCase().includes(search.toLowerCase()) ||
    n.courseTitle.toLowerCase().includes(search.toLowerCase()) ||
    (n.lessonTitle && n.lessonTitle.toLowerCase().includes(search.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="space-y-6 max-w-3xl mx-auto">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-10 w-48" />
        </div>
        <Skeleton className="h-10 w-full rounded-lg" />
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-32 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6 max-w-3xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
              <StickyNote size={24} className="text-accent" /> My Notes
            </h1>
            <p className="text-muted-foreground text-sm">{notes.length} notes saved</p>
          </div>
          <Button 
            onClick={() => setShowAdd(!showAdd)} 
            className="gradient-accent text-accent-foreground hover:opacity-90"
          >
            <Plus size={16} className="mr-1.5" /> New Note
          </Button>
        </motion.div>

        {/* Search */}
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input 
            placeholder="Search notes..." 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
            className="pl-9 bg-card" 
          />
        </div>

        {/* Add Note */}
        {showAdd && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}>
            <Card className="shadow-card border-accent/20">
              <CardContent className="p-4 space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">Associate with Course</label>
                  <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                    <SelectTrigger className="w-full bg-muted/30">
                      <SelectValue placeholder="Select a course" />
                    </SelectTrigger>
                    <SelectContent>
                      {enrollments.map(e => (
                        <SelectItem key={e.courseId} value={e.courseId}>
                          {e.courseTitle}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">Note Content</label>
                  <Textarea 
                    placeholder="Write your note here..." 
                    value={newNote} 
                    onChange={e => setNewNote(e.target.value)} 
                    className="min-h-[100px] bg-muted/30" 
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setShowAdd(false)}
                    disabled={saving}
                  >
                    Cancel
                  </Button>
                  <Button 
                    size="sm" 
                    onClick={handleAddNote} 
                    className="gradient-accent text-accent-foreground hover:opacity-90"
                    disabled={saving || !newNote.trim() || !selectedCourse}
                  >
                    {saving ? "Saving..." : "Save Note"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Notes List */}
        <div className="space-y-3">
          {filtered.map((note, i) => (
            <motion.div 
              key={note.id} 
              initial={{ opacity: 0, y: 10 }} 
              animate={{ opacity: 1, y: 0 }} 
              transition={{ delay: i * 0.05 }}
            >
              <Card className="shadow-card hover:shadow-elevated transition-all group">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      {editingId === note.id ? (
                        <div className="space-y-2">
                          <Textarea
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            className="min-h-[100px] bg-muted/30"
                          />
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleSaveEdit(note.id)}
                              disabled={saving}
                              className="gradient-accent text-accent-foreground"
                            >
                              <Save size={14} className="mr-1" /> Save
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={handleCancelEdit}
                              disabled={saving}
                            >
                              <X size={14} className="mr-1" /> Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-2 mb-1.5">
                            <BookOpen size={12} className="text-accent shrink-0" />
                            <span className="text-xs font-semibold text-accent">{note.courseTitle}</span>
                            {note.lessonTitle && (
                              <>
                                <span className="text-xs text-muted-foreground">•</span>
                                <span className="text-xs text-muted-foreground">{note.lessonTitle}</span>
                              </>
                            )}
                          </div>
                          <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{note.content}</p>
                          <div className="flex items-center gap-3 mt-2">
                            <p className="text-[10px] text-muted-foreground/60">
                              {formatTime(note.updatedAt || note.createdAt)}
                            </p>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => handleStartEdit(note)}
                            >
                              <Edit2 size={12} />
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                    {editingId !== note.id && (
                      <Button
                        variant="ghost" 
                        size="icon"
                        className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handleDeleteNote(note.id)}
                      >
                        <Trash2 size={13} />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
          {filtered.length === 0 && notes.length === 0 && (
            <Card className="shadow-card border-dashed border-2">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                  <StickyNote size={28} className="text-muted-foreground" />
                </div>
                <h3 className="font-display text-lg font-semibold text-foreground mb-1">No notes yet</h3>
                <p className="text-sm text-muted-foreground mb-4">Start taking notes on your courses</p>
                <Button onClick={() => setShowAdd(true)} className="gradient-accent text-accent-foreground">
                  <Plus size={16} className="mr-1.5" /> Create Your First Note
                </Button>
              </CardContent>
            </Card>
          )}
          {filtered.length === 0 && notes.length > 0 && (
            <div className="text-center py-12 text-muted-foreground text-sm">
              No notes match your search
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default CourseNotes;
