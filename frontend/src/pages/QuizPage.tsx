/**
 * Quiz Page - Students take quizzes and see results.
 */
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { quizzesAPI, Quiz, QuizResult } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CheckCircle, XCircle, Trophy } from "lucide-react";

const QuizPage: React.FC = () => {
  const { courseId, quizId } = useParams<{ courseId: string; quizId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [answers, setAnswers] = useState<number[]>([]);
  const [result, setResult] = useState<QuizResult | null>(null);
  const [existingResult, setExistingResult] = useState<QuizResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchQuiz = async () => {
      if (!courseId || !quizId || !user) return;
      try {
        const quizzes = await quizzesAPI.getByCourse(courseId);
        const found = quizzes.find((q) => q.id === quizId);
        if (found) {
          setQuiz(found);
          setAnswers(new Array(found.questions.length).fill(-1));
          const existing = await quizzesAPI.getResults(quizId, user.id);
          if (existing) setExistingResult(existing);
        }
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    fetchQuiz();
  }, [courseId, quizId, user]);

  const handleSubmit = async () => {
    if (!quiz || !user) return;
    setSubmitting(true);
    try {
      const res = await quizzesAPI.submit(quiz.id, answers);
      setResult(res);
    } catch (err) { console.error(err); }
    finally { setSubmitting(false); }
  };

  const displayResult = result || existingResult;

  if (loading) return <div className="flex items-center justify-center h-64"><div className="h-10 w-10 animate-spin rounded-full border-4 border-muted border-t-accent" /></div>;
  if (!quiz) return <div className="text-center py-20"><p className="text-muted-foreground">Quiz not found</p></div>;

  return (
    <>
      <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft size={16} /> Back to Course
        </button>

        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">{quiz.title}</h1>
          <p className="text-muted-foreground">{quiz.questions.length} questions</p>
        </div>

        {displayResult ? (
          <Card className="shadow-card">
            <CardContent className="p-8 text-center">
              <Trophy size={48} className={`mx-auto mb-4 ${displayResult.score >= displayResult.total * 0.7 ? "text-amber-500" : "text-muted-foreground"}`} />
              <h2 className="font-display text-3xl font-bold text-foreground mb-2">{displayResult.score}/{displayResult.total}</h2>
              <p className="text-muted-foreground mb-4">{Math.round((displayResult.score / displayResult.total) * 100)}% correct</p>
              <p className={`text-sm font-medium ${displayResult.score >= displayResult.total * 0.7 ? "text-success" : "text-destructive"}`}>
                {displayResult.score >= displayResult.total * 0.7 ? "🎉 Congratulations! You passed!" : "Keep studying and try again!"}
              </p>

              <div className="mt-6 space-y-3 text-left">
                {quiz.questions.map((q, i) => {
                  const isCorrect = displayResult.answers[i] === q.correctIndex;
                  return (
                    <div key={q.id} className={`p-3 rounded-lg border ${isCorrect ? "border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-900" : "border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900"}`}>
                      <div className="flex items-start gap-2">
                        {isCorrect ? <CheckCircle size={16} className="text-green-600 mt-0.5 flex-shrink-0" /> : <XCircle size={16} className="text-red-600 mt-0.5 flex-shrink-0" />}
                        <div>
                          <p className="text-sm font-medium text-foreground">{q.question}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Your answer: {q.options[displayResult.answers[i]] || "Not answered"} 
                            {!isCorrect && <span className="text-green-600 ml-2">Correct: {q.options[q.correctIndex]}</span>}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <Button className="mt-6" variant="outline" onClick={() => navigate(`/course/${courseId}`)}>Back to Course</Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {quiz.questions.map((q, qIdx) => (
              <Card key={q.id} className="shadow-card">
                <CardContent className="p-5">
                  <p className="font-medium text-foreground mb-3">
                    <span className="text-accent mr-2">Q{qIdx + 1}.</span>{q.question}
                  </p>
                  <div className="space-y-2">
                    {q.options.map((opt, oIdx) => (
                      <button
                        key={oIdx}
                        onClick={() => { const a = [...answers]; a[qIdx] = oIdx; setAnswers(a); }}
                        className={`w-full text-left p-3 rounded-lg border text-sm transition-all ${
                          answers[qIdx] === oIdx ? "border-accent bg-accent/10 text-foreground font-medium" : "border-border hover:border-accent/50 text-muted-foreground"
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}

            <Button onClick={handleSubmit} disabled={submitting || answers.includes(-1)} className="w-full gradient-accent text-accent-foreground font-semibold h-12 hover:opacity-90">
              {submitting ? "Submitting..." : "Submit Quiz"}
            </Button>
          </>
        )}
      </div>
    </>
  );
};

export default QuizPage;
