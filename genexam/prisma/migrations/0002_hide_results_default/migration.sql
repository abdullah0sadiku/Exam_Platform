-- Hide candidate results after submission by default.
-- Existing exams keep whatever flag they already have; only the column
-- default changes so newly created exams start with results hidden.

ALTER TABLE "Exam" ALTER COLUMN "showResultsImmediately" SET DEFAULT false;
