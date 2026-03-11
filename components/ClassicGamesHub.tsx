"use client";

import * as React from "react";
import { BookOpen, Grid3X3, Maximize2, Minimize2, RefreshCcw, Swords, Type } from "lucide-react";

type ClassicGameId = "sudoku" | "wordle" | "crossword" | "chess";

type ChessPiece = {
  type: "p" | "r" | "n" | "b" | "q" | "k";
  color: "w" | "b";
};

const GAME_CARDS: Array<{
  id: ClassicGameId;
  title: string;
  summary: string;
  accent: string;
}> = [
  {
    id: "sudoku",
    title: "Sudoku",
    summary: "Train pattern recognition and constraint solving with a compact board.",
    accent: "from-sky-400/20 to-cyan-300/10",
  },
  {
    id: "wordle",
    title: "Wordle",
    summary: "Build vocabulary, deduction, and rapid elimination in six tries.",
    accent: "from-emerald-400/20 to-lime-300/10",
  },
  {
    id: "crossword",
    title: "Crossword",
    summary: "Connect clues, spelling, and memory inside a quick mini-grid.",
    accent: "from-amber-400/20 to-orange-300/10",
  },
  {
    id: "chess",
    title: "Chess",
    summary: "Practice board vision and piece movement inside a local chess sandbox.",
    accent: "from-rose-400/20 to-fuchsia-300/10",
  },
];

const SUDOKU_BASE_SOLUTION = [
  [1, 2, 3, 4],
  [3, 4, 1, 2],
  [2, 1, 4, 3],
  [4, 3, 2, 1],
];

const SUDOKU_MASKS = [
  [
    [1, 0, 0, 1],
    [0, 1, 1, 0],
    [1, 0, 1, 0],
    [0, 1, 0, 1],
  ],
  [
    [1, 0, 1, 0],
    [0, 1, 0, 1],
    [1, 0, 0, 1],
    [0, 1, 1, 0],
  ],
  [
    [0, 1, 0, 1],
    [1, 0, 1, 0],
    [0, 1, 1, 0],
    [1, 0, 0, 1],
  ],
  [
    [0, 1, 1, 0],
    [1, 0, 0, 1],
    [0, 1, 0, 1],
    [1, 0, 1, 0],
  ],
];

const WORDLE_WORDS = [
  "ARRAY",
  "LOGIC",
  "STACK",
  "QUERY",
  "REACT",
  "STATE",
  "BRAIN",
  "ROUTE",
];

const CROSSWORD_TEMPLATE = [
  ["L", "O", "G", "I", "C"],
  ["A", "#", "S", "#", "O"],
  ["Y", "O", "U", "T", "H"],
  ["E", "#", "D", "#", "E"],
  ["R", "O", "U", "T", "E"],
];

const CROSSWORD_CLUES = {
  across: [
    "1. Logical thinking core skill",
    "2. Young stage of life",
    "3. Navigation path in web apps",
  ],
  down: [
    "1. You plus a second-person subject",
    "2. Opposite ends still meet at a shared letter",
  ],
};

const evaluateWordleGuess = (guess: string, target: string) => {
  const result: Array<"correct" | "present" | "miss"> = Array.from(
    { length: guess.length },
    () => "miss",
  );
  const remaining = target.split("");

  guess.split("").forEach((char, index) => {
    if (target[index] === char) {
      result[index] = "correct";
      remaining[index] = "_";
    }
  });

  guess.split("").forEach((char, index) => {
    if (result[index] === "correct") return;
    const foundIndex = remaining.indexOf(char);
    if (foundIndex >= 0) {
      result[index] = "present";
      remaining[foundIndex] = "_";
    }
  });

  return result;
};

const getSudokuConflictMap = (grid: number[][]) =>
  grid.map((row, rowIndex) =>
    row.map((cell, colIndex) => {
      if (cell === 0) return false;

      const rowConflict = row.some(
        (value, index) => index !== colIndex && value === cell,
      );
      const colConflict = grid.some(
        (gridRow, index) => index !== rowIndex && gridRow[colIndex] === cell,
      );
      const boxRowStart = Math.floor(rowIndex / 2) * 2;
      const boxColStart = Math.floor(colIndex / 2) * 2;

      let boxConflict = false;
      for (let r = boxRowStart; r < boxRowStart + 2; r += 1) {
        for (let c = boxColStart; c < boxColStart + 2; c += 1) {
          if ((r !== rowIndex || c !== colIndex) && grid[r][c] === cell) {
            boxConflict = true;
          }
        }
      }

      return rowConflict || colConflict || boxConflict;
    }),
  );

const shuffleArray = <T,>(items: T[]) => {
  const copy = [...items];

  for (let index = copy.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[randomIndex]] = [copy[randomIndex], copy[index]];
  }

  return copy;
};

const generateSudokuRound = () => {
  const digitOrder = shuffleArray([1, 2, 3, 4]);
  const rowOrder = [...shuffleArray([0, 1]), ...shuffleArray([2, 3])];
  const colOrder = [...shuffleArray([0, 1]), ...shuffleArray([2, 3])];
  const mask = SUDOKU_MASKS[Math.floor(Math.random() * SUDOKU_MASKS.length)];

  const remapDigit = (value: number) => digitOrder[value - 1];
  const solution = rowOrder.map((rowIndex) =>
    colOrder.map((colIndex) => remapDigit(SUDOKU_BASE_SOLUTION[rowIndex][colIndex])),
  );
  const puzzle = solution.map((row, rowIndex) =>
    row.map((cell, colIndex) => (mask[rowIndex][colIndex] ? cell : 0)),
  );

  return { puzzle, solution };
};

const createChessBoard = (): Array<Array<ChessPiece | null>> => [
  [
    { type: "r", color: "b" },
    { type: "n", color: "b" },
    { type: "b", color: "b" },
    { type: "q", color: "b" },
    { type: "k", color: "b" },
    { type: "b", color: "b" },
    { type: "n", color: "b" },
    { type: "r", color: "b" },
  ],
  Array.from({ length: 8 }, () => ({ type: "p", color: "b" as const })),
  Array.from({ length: 8 }, () => null),
  Array.from({ length: 8 }, () => null),
  Array.from({ length: 8 }, () => null),
  Array.from({ length: 8 }, () => null),
  Array.from({ length: 8 }, () => ({ type: "p", color: "w" as const })),
  [
    { type: "r", color: "w" },
    { type: "n", color: "w" },
    { type: "b", color: "w" },
    { type: "q", color: "w" },
    { type: "k", color: "w" },
    { type: "b", color: "w" },
    { type: "n", color: "w" },
    { type: "r", color: "w" },
  ],
];

const pieceSymbols: Record<ChessPiece["type"], Record<ChessPiece["color"], string>> = {
  p: { w: "♙", b: "♟" },
  r: { w: "♖", b: "♜" },
  n: { w: "♘", b: "♞" },
  b: { w: "♗", b: "♝" },
  q: { w: "♕", b: "♛" },
  k: { w: "♔", b: "♚" },
};

const initialPieceCounts: Record<ChessPiece["color"], Record<ChessPiece["type"], number>> = {
  w: { p: 8, r: 2, n: 2, b: 2, q: 1, k: 1 },
  b: { p: 8, r: 2, n: 2, b: 2, q: 1, k: 1 },
};

const isInsideBoard = (row: number, col: number) =>
  row >= 0 && row < 8 && col >= 0 && col < 8;

const isPathClear = (
  board: Array<Array<ChessPiece | null>>,
  fromRow: number,
  fromCol: number,
  toRow: number,
  toCol: number,
) => {
  const rowStep = Math.sign(toRow - fromRow);
  const colStep = Math.sign(toCol - fromCol);
  let row = fromRow + rowStep;
  let col = fromCol + colStep;

  while (row !== toRow || col !== toCol) {
    if (board[row][col]) return false;
    row += rowStep;
    col += colStep;
  }

  return true;
};

const isValidChessMove = (
  board: Array<Array<ChessPiece | null>>,
  fromRow: number,
  fromCol: number,
  toRow: number,
  toCol: number,
  turn: "w" | "b",
) => {
  if (!isInsideBoard(toRow, toCol)) return false;
  const piece = board[fromRow][fromCol];
  const target = board[toRow][toCol];
  if (!piece || piece.color !== turn) return false;
  if (target?.color === piece.color) return false;

  const rowDiff = toRow - fromRow;
  const colDiff = toCol - fromCol;
  const absRow = Math.abs(rowDiff);
  const absCol = Math.abs(colDiff);

  switch (piece.type) {
    case "p": {
      const direction = piece.color === "w" ? -1 : 1;
      const startRow = piece.color === "w" ? 6 : 1;
      if (colDiff === 0 && !target) {
        if (rowDiff === direction) return true;
        if (
          fromRow === startRow &&
          rowDiff === direction * 2 &&
          !board[fromRow + direction][fromCol]
        ) {
          return true;
        }
      }
      return absCol === 1 && rowDiff === direction && !!target;
    }
    case "r":
      return (rowDiff === 0 || colDiff === 0) && isPathClear(board, fromRow, fromCol, toRow, toCol);
    case "n":
      return (absRow === 2 && absCol === 1) || (absRow === 1 && absCol === 2);
    case "b":
      return absRow === absCol && isPathClear(board, fromRow, fromCol, toRow, toCol);
    case "q":
      return (
        (rowDiff === 0 || colDiff === 0 || absRow === absCol) &&
        isPathClear(board, fromRow, fromCol, toRow, toCol)
      );
    case "k":
      return absRow <= 1 && absCol <= 1;
    default:
      return false;
  }
};

const cloneBoard = (board: Array<Array<ChessPiece | null>>) =>
  board.map((row) => row.map((cell) => (cell ? { ...cell } : null)));

const applyChessMove = (
  board: Array<Array<ChessPiece | null>>,
  fromRow: number,
  fromCol: number,
  toRow: number,
  toCol: number,
) => {
  const nextBoard = cloneBoard(board);
  const movingPiece = nextBoard[fromRow][fromCol];
  if (!movingPiece) return nextBoard;

  nextBoard[toRow][toCol] =
    movingPiece.type === "p" && (toRow === 0 || toRow === 7)
      ? { type: "q", color: movingPiece.color }
      : movingPiece;
  nextBoard[fromRow][fromCol] = null;

  return nextBoard;
};

const findKing = (board: Array<Array<ChessPiece | null>>, color: "w" | "b") => {
  for (let row = 0; row < 8; row += 1) {
    for (let col = 0; col < 8; col += 1) {
      const piece = board[row][col];
      if (piece?.type === "k" && piece.color === color) {
        return [row, col] as const;
      }
    }
  }

  return null;
};

const isKingInCheck = (board: Array<Array<ChessPiece | null>>, color: "w" | "b") => {
  const king = findKing(board, color);
  if (!king) return false;

  const enemyColor = color === "w" ? "b" : "w";
  for (let row = 0; row < 8; row += 1) {
    for (let col = 0; col < 8; col += 1) {
      const piece = board[row][col];
      if (!piece || piece.color !== enemyColor) continue;
      if (isValidChessMove(board, row, col, king[0], king[1], enemyColor)) {
        return true;
      }
    }
  }

  return false;
};

const getLegalMoves = (
  board: Array<Array<ChessPiece | null>>,
  row: number,
  col: number,
  turn: "w" | "b",
) => {
  const piece = board[row][col];
  if (!piece || piece.color !== turn) return [];

  const legalMoves: Array<[number, number]> = [];

  for (let nextRow = 0; nextRow < 8; nextRow += 1) {
    for (let nextCol = 0; nextCol < 8; nextCol += 1) {
      if (!isValidChessMove(board, row, col, nextRow, nextCol, turn)) continue;

      const nextBoard = applyChessMove(board, row, col, nextRow, nextCol);
      if (!isKingInCheck(nextBoard, turn)) {
        legalMoves.push([nextRow, nextCol]);
      }
    }
  }

  return legalMoves;
};

const hasAnyLegalMove = (board: Array<Array<ChessPiece | null>>, turn: "w" | "b") => {
  for (let row = 0; row < 8; row += 1) {
    for (let col = 0; col < 8; col += 1) {
      const piece = board[row][col];
      if (!piece || piece.color !== turn) continue;
      if (getLegalMoves(board, row, col, turn).length > 0) {
        return true;
      }
    }
  }

  return false;
};

const getCapturedPieceSymbols = (
  board: Array<Array<ChessPiece | null>>,
  capturedColor: "w" | "b",
) => {
  const remaining = { ...initialPieceCounts[capturedColor] };

  board.forEach((row) => {
    row.forEach((piece) => {
      if (piece?.color === capturedColor) {
        remaining[piece.type] = Math.max(0, remaining[piece.type] - 1);
      }
    });
  });

  const order: ChessPiece["type"][] = ["q", "r", "b", "n", "p"];
  return order.flatMap((type) =>
    Array.from({ length: remaining[type] }, () => pieceSymbols[type][capturedColor]),
  );
};

const SudokuGame = () => {
  const [round, setRound] = React.useState(() => generateSudokuRound());
  const [grid, setGrid] = React.useState(() => round.puzzle.map((row) => [...row]));
  const conflicts = React.useMemo(() => getSudokuConflictMap(grid), [grid]);

  const reset = React.useCallback(() => {
    const nextRound = generateSudokuRound();
    setRound(nextRound);
    setGrid(nextRound.puzzle.map((row) => [...row]));
  }, []);

  const updateCell = (row: number, col: number, value: string) => {
    if (round.puzzle[row][col] !== 0) return;
    const normalized = value.replace(/[^1-4]/g, "");
    setGrid((current) =>
      current.map((gridRow, rowIndex) =>
        gridRow.map((cell, colIndex) =>
          rowIndex === row && colIndex === col ? Number(normalized || 0) : cell,
        ),
      ),
    );
  };

  const solved = grid.every((row, rowIndex) =>
    row.every((cell, colIndex) => cell === round.solution[rowIndex][colIndex]),
  );
  const hasConflicts = conflicts.some((row) => row.some(Boolean));

  React.useEffect(() => {
    if (!solved) return;

    const timeoutId = window.setTimeout(() => {
      reset();
    }, 900);

    return () => window.clearTimeout(timeoutId);
  }, [reset, solved]);

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-xl text-white">Mini Sudoku</h3>
            <p className="mt-1 text-sm text-light-400">4x4 focus board for quick logic training.</p>
          </div>
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/6 px-4 py-2 text-sm text-white hover:bg-white/10"
          >
            <RefreshCcw className="size-4" />
            Reset
          </button>
        </div>

        <div className="mx-auto grid max-w-[560px] grid-cols-4 gap-3">
          {grid.map((row, rowIndex) =>
            row.map((cell, colIndex) => {
              const fixed = round.puzzle[rowIndex][colIndex] !== 0;
              const correct = cell !== 0 && cell === round.solution[rowIndex][colIndex];
              const conflict = conflicts[rowIndex][colIndex];

              return (
                <input
                  key={`${rowIndex}-${colIndex}`}
                  value={cell || ""}
                  onChange={(event) => updateCell(rowIndex, colIndex, event.target.value)}
                  disabled={fixed}
                  maxLength={1}
                  className={`aspect-square rounded-2xl border text-center text-xl font-semibold outline-none ${
                    fixed
                      ? "border-primary-200/30 bg-primary-200/12 text-white"
                      : conflict
                        ? "border-red-400/50 bg-red-500/10 text-white"
                      : correct
                        ? "border-emerald-400/40 bg-emerald-500/10 text-white"
                        : "border-white/10 bg-black/20 text-white"
                  }`}
                />
              );
            }),
          )}
        </div>

        <p className="mt-4 text-sm text-light-100">
          {solved
            ? "Solved correctly."
            : hasConflicts
              ? "Some entries conflict with row, column, or box rules."
              : "Fill the board so each row, column, and 2x2 box contains 1 to 4."}
        </p>
    </div>
  );
};

const WordleGame = () => {
  const [seed, setSeed] = React.useState(0);
  const target = React.useMemo(() => WORDLE_WORDS[seed % WORDLE_WORDS.length], [seed]);
  const [guesses, setGuesses] = React.useState<string[]>([]);
  const [guess, setGuess] = React.useState("");

  const reset = () => {
    setSeed((value) => value + 1);
    setGuesses([]);
    setGuess("");
  };

  const submitGuess = () => {
    const normalized = guess.trim().toUpperCase();
    if (normalized.length !== 5 || guesses.length >= 6 || won) return;
    setGuesses((current) => [...current, normalized]);
    setGuess("");
  };

  const won = guesses.includes(target);
  const lost = guesses.length >= 6 && !won;
  const evaluatedGuesses = React.useMemo(
    () => guesses.map((word) => evaluateWordleGuess(word, target)),
    [guesses, target],
  );

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-xl text-white">Mini Wordle</h3>
            <p className="mt-1 text-sm text-light-400">Guess the hidden five-letter word.</p>
          </div>
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/6 px-4 py-2 text-sm text-white hover:bg-white/10"
          >
            <RefreshCcw className="size-4" />
            New Word
          </button>
        </div>

        <div className="mx-auto max-w-[560px] space-y-2">
          {Array.from({ length: 6 }, (_, rowIndex) => {
            const word = guesses[rowIndex] || "";
            return (
              <div key={rowIndex} className="grid grid-cols-5 gap-2">
                {Array.from({ length: 5 }, (_, colIndex) => {
                  const char = word[colIndex] || "";
                  const state = word ? evaluatedGuesses[rowIndex][colIndex] : "empty";
                  const stateClass =
                    state === "correct"
                      ? "border-emerald-400/40 bg-emerald-500/10"
                      : state === "present"
                        ? "border-amber-400/40 bg-amber-500/10"
                        : state === "miss"
                          ? "border-white/10 bg-black/20"
                          : "border-white/10 bg-black/15";

                  return (
                    <div
                      key={colIndex}
                      className={`flex aspect-square items-center justify-center rounded-2xl border text-xl font-semibold text-white ${stateClass}`}
                    >
                      {char}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <input
            value={guess}
            onChange={(event) =>
              setGuess(event.target.value.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 5))
            }
            placeholder="Enter 5-letter word"
            className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none"
          />
          <button
            type="button"
            onClick={submitGuess}
            disabled={won || lost}
            className="rounded-full bg-primary-200 px-5 py-3 text-sm font-bold text-dark-100 disabled:opacity-60"
          >
            Guess
          </button>
        </div>

        <p className="mt-4 text-sm text-light-100">
          {won ? `Solved. The word was ${target}.` : lost ? `Out of tries. The word was ${target}.` : "You have 6 guesses."}
        </p>

        <div className="mt-5 flex flex-wrap gap-2">
          {"QWERTYUIOPASDFGHJKLZXCVBNM".split("").map((letter) => {
            let status: "correct" | "present" | "miss" | "unused" = "unused";
            evaluatedGuesses.forEach((states, guessIndex) => {
              guesses[guessIndex]?.split("").forEach((char, charIndex) => {
                if (char !== letter) return;
                const nextState = states[charIndex];
                if (nextState === "correct") status = "correct";
                else if (nextState === "present" && status !== "correct") status = "present";
                else if (status === "unused") status = "miss";
              });
            });

            const keyClass =
              status === "correct"
                ? "border-emerald-400/40 bg-emerald-500/10"
                : status === "present"
                  ? "border-amber-400/40 bg-amber-500/10"
                  : status === "miss"
                    ? "border-white/10 bg-black/20"
                    : "border-white/10 bg-white/5";

            return (
              <span
                key={letter}
                className={`inline-flex size-9 items-center justify-center rounded-xl border text-xs font-semibold text-white ${keyClass}`}
              >
                {letter}
              </span>
            );
          })}
        </div>
    </div>
  );
};

const CrosswordGame = () => {
  const [grid, setGrid] = React.useState(
    CROSSWORD_TEMPLATE.map((row) => row.map((cell) => (cell === "#" ? "#" : ""))),
  );

  const reset = () =>
    setGrid(CROSSWORD_TEMPLATE.map((row) => row.map((cell) => (cell === "#" ? "#" : ""))));

  const updateCell = (row: number, col: number, value: string) => {
    if (CROSSWORD_TEMPLATE[row][col] === "#") return;
    const letter = value.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 1);
    setGrid((current) =>
      current.map((gridRow, rowIndex) =>
        gridRow.map((cell, colIndex) => (rowIndex === row && colIndex === col ? letter : cell)),
      ),
    );
  };

  const solved = grid.every((row, rowIndex) =>
    row.every((cell, colIndex) =>
      CROSSWORD_TEMPLATE[rowIndex][colIndex] === "#"
        ? cell === "#"
        : cell === CROSSWORD_TEMPLATE[rowIndex][colIndex],
    ),
  );
  const filledCells = grid.flat().filter((cell) => cell && cell !== "#").length;
  const totalCells = CROSSWORD_TEMPLATE.flat().filter((cell) => cell !== "#").length;
  const progress = Math.round((filledCells / totalCells) * 100);

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-xl text-white">Mini Crossword</h3>
            <p className="mt-1 text-sm text-light-400">A short clue grid inside Logic Arena.</p>
          </div>
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/6 px-4 py-2 text-sm text-white hover:bg-white/10"
          >
            <RefreshCcw className="size-4" />
            Reset
          </button>
        </div>

        <div className="grid max-w-[480px] grid-cols-5 gap-2">
          {grid.map((row, rowIndex) =>
            row.map((cell, colIndex) => {
              const blocked = CROSSWORD_TEMPLATE[rowIndex][colIndex] === "#";
              return blocked ? (
                <div key={`${rowIndex}-${colIndex}`} className="aspect-square rounded-xl bg-black" />
              ) : (
                <input
                  key={`${rowIndex}-${colIndex}`}
                  value={cell}
                  onChange={(event) => updateCell(rowIndex, colIndex, event.target.value)}
                  maxLength={1}
                  className={`aspect-square rounded-xl border text-center text-lg font-semibold text-white outline-none ${
                    cell && cell === CROSSWORD_TEMPLATE[rowIndex][colIndex]
                      ? "border-emerald-400/40 bg-emerald-500/10"
                      : cell
                        ? "border-amber-400/30 bg-amber-500/10"
                        : "border-white/10 bg-black/20"
                  }`}
                />
              );
            }),
          )}
        </div>

        <p className="mt-4 text-sm text-light-100">
          {solved
            ? "Crossword completed correctly."
            : `Use the clues to fill the grid. Progress: ${progress}%.`}
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-light-400">Across</p>
            <div className="mt-3 space-y-2">
              {CROSSWORD_CLUES.across.map((clue) => (
                <p key={clue} className="text-sm text-light-100">
                  {clue}
                </p>
              ))}
            </div>
          </div>
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-light-400">Down</p>
            <div className="mt-3 space-y-2">
              {CROSSWORD_CLUES.down.map((clue) => (
                <p key={clue} className="text-sm text-light-100">
                  {clue}
                </p>
              ))}
            </div>
          </div>
        </div>
    </div>
  );
};

const ChessGame = () => {
  const [board, setBoard] = React.useState(createChessBoard);
  const [turn, setTurn] = React.useState<"w" | "b">("w");
  const [selected, setSelected] = React.useState<[number, number] | null>(null);
  const [message, setMessage] = React.useState("White to move.");
  const [isFullscreen, setIsFullscreen] = React.useState(false);
  const [winner, setWinner] = React.useState<"White" | "Black" | null>(null);

  const legalMoves = React.useMemo(() => {
    if (!selected) return [];
    return getLegalMoves(board, selected[0], selected[1], turn);
  }, [board, selected, turn]);
  const capturedBlack = React.useMemo(() => getCapturedPieceSymbols(board, "b"), [board]);
  const capturedWhite = React.useMemo(() => getCapturedPieceSymbols(board, "w"), [board]);
  const whiteKing = React.useMemo(() => findKing(board, "w"), [board]);
  const blackKing = React.useMemo(() => findKing(board, "b"), [board]);
  const whiteInCheck = React.useMemo(() => isKingInCheck(board, "w"), [board]);
  const blackInCheck = React.useMemo(() => isKingInCheck(board, "b"), [board]);

  const reset = () => {
    setBoard(createChessBoard());
    setTurn("w");
    setSelected(null);
    setMessage("White to move.");
    setIsFullscreen(false);
    setWinner(null);
  };

  const handleSquareClick = (row: number, col: number) => {
    if (winner) return;

    const piece = board[row][col];

    if (!selected) {
      if (piece?.color === turn) {
        setSelected([row, col]);
        setMessage(`${turn === "w" ? "White" : "Black"} selected ${piece.type.toUpperCase()}.`);
      } else {
        setMessage(`${turn === "w" ? "White" : "Black"} to move.`);
      }
      return;
    }

    const [fromRow, fromCol] = selected;
    if (fromRow === row && fromCol === col) {
      setSelected(null);
      setMessage(`${turn === "w" ? "White" : "Black"} to move.`);
      return;
    }

    const isLegalTarget = legalMoves.some(([moveRow, moveCol]) => moveRow === row && moveCol === col);

    if (!isLegalTarget) {
      if (piece?.color === turn) {
        setSelected([row, col]);
        setMessage(`${turn === "w" ? "White" : "Black"} selected ${piece.type.toUpperCase()}.`);
      } else {
        setMessage("Illegal move. Keep your king safe and follow piece rules.");
      }
      return;
    }

    const movingPiece = board[fromRow][fromCol];
    if (!movingPiece) return;

    const nextBoard = applyChessMove(board, fromRow, fromCol, row, col);
    const nextTurn = turn === "w" ? "b" : "w";
    const opponentChecked = isKingInCheck(nextBoard, nextTurn);
    const opponentHasMove = hasAnyLegalMove(nextBoard, nextTurn);
    const isCheckmate = opponentChecked && !opponentHasMove;
    const winnerName = turn === "w" ? "White" : "Black";

    setBoard(nextBoard);
    setSelected(null);
    if (isCheckmate) {
      setWinner(winnerName);
      setMessage(`Checkmate. ${winnerName} wins.`);
      return;
    }

    setTurn(nextTurn);
    setMessage(
      opponentChecked
        ? `${nextTurn === "w" ? "White" : "Black"} is in check.`
        : `${nextTurn === "w" ? "White" : "Black"} to move.`,
    );
  };

  const boardContent = (
    <>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-xl text-white">Chess Trainer</h3>
          <p className="mt-1 text-sm text-light-400">
            Responsive local board with legal move highlights and king safety.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setIsFullscreen((value) => !value)}
            className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/6 px-4 py-2 text-sm text-white hover:bg-white/10"
          >
            {isFullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
            {isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
          </button>
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/6 px-4 py-2 text-sm text-white hover:bg-white/10"
          >
            <RefreshCcw className="size-4" />
            Reset
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <div className="w-full lg:max-w-[620px]">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
            <div className="flex items-center gap-3">
              <span className="rounded-full border border-primary-200/30 bg-primary-200/12 px-3 py-1 text-sm font-semibold text-primary-100">
                {winner ? `${winner} won` : `${turn === "w" ? "White" : "Black"} to move`}
              </span>
              <span className="text-sm text-light-400">Tap a piece to see legal moves.</span>
            </div>
            <span className="text-sm text-light-100">{message}</span>
          </div>

          {winner ? (
            <div className="mb-4 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3">
              <p className="text-base font-semibold text-white">Checkmate</p>
              <p className="mt-1 text-sm text-light-100">{winner} wins the game.</p>
            </div>
          ) : null}

          <div className="mx-auto w-full max-w-[92vw] sm:max-w-[560px] lg:max-w-[620px]">
            <div className="grid grid-cols-8 overflow-hidden rounded-[28px] border border-primary-200/25 shadow-[0_0_0_1px_rgba(202,197,254,0.14),0_24px_60px_rgba(0,0,0,0.28),0_0_28px_rgba(202,197,254,0.22)]">
              {board.map((row, rowIndex) =>
                row.map((piece, colIndex) => {
                  const dark = (rowIndex + colIndex) % 2 === 1;
                  const isSelected = selected?.[0] === rowIndex && selected?.[1] === colIndex;
                  const isMoveTarget = legalMoves.some(
                    ([moveRow, moveCol]) => moveRow === rowIndex && moveCol === colIndex,
                  );
                  const isCheckedKing =
                    piece?.type === "k" &&
                    ((piece.color === "w" &&
                      whiteInCheck &&
                      whiteKing?.[0] === rowIndex &&
                      whiteKing?.[1] === colIndex) ||
                      (piece.color === "b" &&
                        blackInCheck &&
                        blackKing?.[0] === rowIndex &&
                        blackKing?.[1] === colIndex));

                  return (
                    <button
                      key={`${rowIndex}-${colIndex}`}
                      type="button"
                      onClick={() => handleSquareClick(rowIndex, colIndex)}
                      className={`relative flex aspect-square items-center justify-center ${
                        dark ? "bg-[#5a7088]" : "bg-[#e7d2b5]"
                      } ${isSelected ? "ring-4 ring-primary-200 ring-inset" : ""} ${
                        isCheckedKing ? "bg-red-500/45" : ""
                      }`}
                    >
                      {isMoveTarget ? (
                        <span className="absolute inset-0 m-auto size-4 rounded-full bg-primary-200/65 sm:size-5" />
                      ) : null}
                      {piece ? (
                        <span
                          className={`relative z-10 select-none font-serif leading-none ${
                            piece.color === "w"
                              ? "text-[2rem] text-[#fbfaf6] drop-shadow-[0_2px_2px_rgba(0,0,0,0.45)] sm:text-[2.6rem] lg:text-[3rem]"
                              : "text-[2rem] text-[#17202b] drop-shadow-[0_2px_1px_rgba(255,255,255,0.25)] sm:text-[2.6rem] lg:text-[3rem]"
                          }`}
                        >
                          {pieceSymbols[piece.type][piece.color]}
                        </span>
                      ) : null}
                    </button>
                  );
                }),
              )}
            </div>
          </div>
        </div>

        <div className="w-full rounded-3xl border border-white/10 bg-white/5 p-5 lg:max-w-[220px]">
          <h4 className="text-lg text-white">Captured Pieces</h4>
          <div className="mt-4 space-y-4">
            <div className="rounded-2xl border border-white/8 bg-black/15 p-4">
              <p className="text-sm font-semibold text-primary-100">White captured</p>
              <div className="mt-3 flex min-h-12 flex-wrap gap-2">
                {capturedBlack.length > 0 ? (
                  capturedBlack.map((symbol, index) => (
                    <span
                      key={`captured-black-${index}`}
                      className="inline-flex size-9 items-center justify-center rounded-xl bg-slate-200 text-xl text-slate-900"
                    >
                      {symbol}
                    </span>
                  ))
                ) : (
                  <p className="text-sm text-light-400">No black pieces captured yet.</p>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-white/8 bg-black/15 p-4">
              <p className="text-sm font-semibold text-primary-100">Black captured</p>
              <div className="mt-3 flex min-h-12 flex-wrap gap-2">
                {capturedWhite.length > 0 ? (
                  capturedWhite.map((symbol, index) => (
                    <span
                      key={`captured-white-${index}`}
                      className="inline-flex size-9 items-center justify-center rounded-xl bg-slate-700 text-xl text-white"
                    >
                      {symbol}
                    </span>
                  ))
                ) : (
                  <p className="text-sm text-light-400">No white pieces captured yet.</p>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="w-full rounded-3xl border border-white/10 bg-white/5 p-5 lg:max-w-[280px]">
          <h4 className="text-lg text-white">Game State</h4>
          <div className="mt-4 grid gap-3">
            <div className="rounded-2xl border border-white/8 bg-black/15 p-4">
              <p className="text-sm text-light-400">Status</p>
              <p className="mt-1 text-white">{winner ? "Finished" : "In Progress"}</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/15 p-4">
              <p className="text-sm text-light-400">Turn</p>
              <p className="mt-1 text-white">
                {winner ? `${winner} won` : `${turn === "w" ? "White" : "Black"} to move`}
              </p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/15 p-4">
              <p className="text-sm text-light-400">Board Note</p>
              <p className="mt-1 text-white">{message}</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );

  return (
    <>
      <div className="rounded-3xl border border-white/10 bg-white/5 p-5">{boardContent}</div>
      {isFullscreen ? (
        <div className="fixed inset-0 z-[120] bg-[radial-gradient(circle_at_top,rgba(202,197,254,0.16),transparent_30%),rgba(4,7,14,0.97)] p-4 sm:p-6">
          <div className="mx-auto h-full max-w-7xl overflow-auto rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(15,18,32,0.98),rgba(8,10,18,0.98))] p-4 shadow-[0_30px_80px_rgba(0,0,0,0.42)] sm:p-6">
            {boardContent}
          </div>
        </div>
      ) : null}
    </>
  );
};

const ClassicGamesHub = () => {
  const [selectedGame, setSelectedGame] = React.useState<ClassicGameId>("sudoku");

  return (
    <div className="flex flex-col gap-8">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {GAME_CARDS.map((game) => {
          const active = selectedGame === game.id;
          const Icon =
            game.id === "sudoku"
              ? Grid3X3
              : game.id === "wordle"
                ? Type
                : game.id === "crossword"
                  ? BookOpen
                  : Swords;

          return (
            <button
              key={game.id}
              type="button"
              onClick={() => setSelectedGame(game.id)}
              className={`rounded-3xl border p-5 text-left transition-all ${
                active
                  ? "border-primary-200/40 bg-primary-200/12 shadow-[0_0_30px_rgba(202,197,254,0.16)]"
                  : "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/[0.07]"
              }`}
            >
              <div
                className={`inline-flex rounded-2xl bg-gradient-to-br ${game.accent} p-3 text-white`}
              >
                <Icon className="size-5" />
              </div>
              <h3 className="mt-4 text-xl text-white">{game.title}</h3>
              <p className="mt-2 text-sm text-light-400">{game.summary}</p>
            </button>
          );
        })}
      </section>

      {selectedGame === "sudoku" ? <SudokuGame /> : null}
      {selectedGame === "wordle" ? <WordleGame /> : null}
      {selectedGame === "crossword" ? <CrosswordGame /> : null}
      {selectedGame === "chess" ? <ChessGame /> : null}
    </div>
  );
};

export default ClassicGamesHub;
