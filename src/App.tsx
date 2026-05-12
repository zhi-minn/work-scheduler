import { useEffect, useMemo, useState } from "react";
import { getChunkTabDate, getWeekOfLabels } from "./dates";
import {
  buildSchedule,
  normalizeInputs,
  SHIFT_HOURS,
  TOTAL_HOURS,
  WEEK_COUNT
} from "./scheduler";

const STORAGE_KEY = "nurse-work-scheduler-chunks";
const LEGACY_STORAGE_KEY = "nurse-work-scheduler-inputs";

type ScheduleChunk = {
  id: string;
  title: string;
  startDate: string;
  inputs: string[];
};

type SchedulerState = {
  activeChunkId: string;
  chunks: ScheduleChunk[];
  nextChunkNumber: number;
};

function createChunk(chunkNumber: number): ScheduleChunk {
  return {
    id: `chunk-${Date.now()}-${chunkNumber}`,
    title: `Chunk ${chunkNumber}`,
    startDate: "",
    inputs: normalizeInputs([])
  };
}

function createInitialState(): SchedulerState {
  const firstChunk = createChunk(1);
  return {
    activeChunkId: firstChunk.id,
    chunks: [firstChunk],
    nextChunkNumber: 2
  };
}

function loadSavedState(): SchedulerState {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);

    if (saved) {
      const parsed = JSON.parse(saved) as Partial<SchedulerState>;
      const chunks: ScheduleChunk[] = Array.isArray(parsed.chunks)
        ? parsed.chunks.map(normalizeChunk).filter((chunk: ScheduleChunk | null): chunk is ScheduleChunk => chunk !== null)
        : [];

      if (chunks.length > 0) {
        const savedActiveChunkId = typeof parsed.activeChunkId === "string" ? parsed.activeChunkId : "";
        const activeChunkId = chunks.some((chunk) => chunk.id === savedActiveChunkId) ? savedActiveChunkId : chunks[0].id;
        const nextChunkNumber = Number.isInteger(parsed.nextChunkNumber) ? Number(parsed.nextChunkNumber) : chunks.length + 1;

        return {
          activeChunkId,
          chunks,
          nextChunkNumber
        };
      }
    }

    const legacyInputs = window.localStorage.getItem(LEGACY_STORAGE_KEY);

    if (legacyInputs) {
      const parsed = JSON.parse(legacyInputs);
      if (Array.isArray(parsed)) {
        const firstChunk = createChunk(1);
        return {
          activeChunkId: firstChunk.id,
          chunks: [{ ...firstChunk, inputs: normalizeInputs(parsed.map(String)) }],
          nextChunkNumber: 2
        };
      }
    }
  } catch {
    return createInitialState();
  }

  return createInitialState();
}

function normalizeChunk(value: unknown): ScheduleChunk | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const chunk = value as Partial<ScheduleChunk>;
  if (typeof chunk.id !== "string" || typeof chunk.title !== "string") {
    return null;
  }

  return {
    id: chunk.id,
    title: chunk.title,
    startDate: typeof chunk.startDate === "string" ? chunk.startDate : "",
    inputs: normalizeInputs(Array.isArray(chunk.inputs) ? chunk.inputs.map(String) : [])
  };
}

export default function App() {
  const [state, setState] = useState<SchedulerState>(loadSavedState);
  const activeChunk = state.chunks.find((chunk) => chunk.id === state.activeChunkId) ?? state.chunks[0];
  const schedule = useMemo(() => buildSchedule(activeChunk.inputs), [activeChunk.inputs]);
  const weekOfLabels = useMemo(() => getWeekOfLabels(activeChunk.startDate), [activeChunk.startDate]);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    window.localStorage.removeItem(LEGACY_STORAGE_KEY);
  }, [state]);

  const updateActiveChunk = (updater: (chunk: ScheduleChunk) => ScheduleChunk) => {
    setState((current) => ({
      ...current,
      chunks: current.chunks.map((chunk) => (chunk.id === current.activeChunkId ? updater(chunk) : chunk))
    }));
  };

  const updateWeek = (weekIndex: number, value: string) => {
    updateActiveChunk((chunk) => ({
      ...chunk,
      inputs: chunk.inputs.map((input, index) => (index === weekIndex ? value : input))
    }));
  };

  const updateStartDate = (startDate: string) => {
    updateActiveChunk((chunk) => ({ ...chunk, startDate }));
  };

  const addChunk = () => {
    setState((current) => {
      const nextChunk = createChunk(current.nextChunkNumber);

      return {
        activeChunkId: nextChunk.id,
        chunks: [...current.chunks, nextChunk],
        nextChunkNumber: current.nextChunkNumber + 1
      };
    });
  };

  const selectChunk = (chunkId: string) => {
    setState((current) => ({ ...current, activeChunkId: chunkId }));
  };

  const resetSchedule = () => {
    updateActiveChunk((chunk) => ({ ...chunk, inputs: normalizeInputs([]) }));
  };

  const deleteActiveChunk = () => {
    setState((current) => {
      if (current.chunks.length === 1) {
        const replacement = createChunk(1);
        return {
          activeChunkId: replacement.id,
          chunks: [replacement],
          nextChunkNumber: 2
        };
      }

      const activeIndex = current.chunks.findIndex((chunk) => chunk.id === current.activeChunkId);
      const chunks = current.chunks.filter((chunk) => chunk.id !== current.activeChunkId);
      const nextActiveChunk = chunks[Math.max(0, activeIndex - 1)] ?? chunks[0];

      return {
        ...current,
        activeChunkId: nextActiveChunk.id,
        chunks
      };
    });
  };

  const statusClass = schedule.hasInvalidInputs || !schedule.isComplete ? "warning" : "success";

  return (
    <main className="app-shell">
      <section className="planner">
        <header className="app-header">
          <div>
            <p className="eyebrow">11-week recurring chunk</p>
            <h1>Nurse Work Scheduler</h1>
          </div>
          <div className="header-actions">
            <button className="secondary-button" type="button" onClick={deleteActiveChunk}>
              Delete Chunk
            </button>
            <button className="reset-button" type="button" onClick={resetSchedule}>
              Reset Hours
            </button>
          </div>
        </header>

        <section className="chunk-tabs" aria-label="Schedule chunks">
          <div className="tab-list" role="tablist">
            {state.chunks.map((chunk) => (
              <button
                aria-selected={chunk.id === activeChunk.id}
                className={`chunk-tab ${chunk.id === activeChunk.id ? "active" : ""}`}
                key={chunk.id}
                role="tab"
                type="button"
                onClick={() => selectChunk(chunk.id)}
              >
                <strong>{chunk.title}</strong>
                <span>{getChunkTabDate(chunk.startDate)}</span>
              </button>
            ))}
          </div>
          <button className="add-tab-button" type="button" onClick={addChunk}>
            Add Chunk
          </button>
        </section>

        <section className="chunk-settings" aria-label="Chunk settings">
          <label className="date-field">
            <span>First week starts</span>
            <input
              type="date"
              value={activeChunk.startDate}
              onChange={(event) => updateStartDate(event.currentTarget.value)}
              onInput={(event) => updateStartDate(event.currentTarget.value)}
            />
          </label>
          <p>Weeks are labeled in 7-day steps from this start date.</p>
        </section>

        <section className="summary-grid" aria-label="Schedule totals">
          <SummaryItem label="Entered" value={schedule.enteredHours} />
          <SummaryItem label="Suggested" value={schedule.suggestedHours} />
          <SummaryItem label="Planned" value={schedule.plannedHours} />
          <SummaryItem label="Remaining" value={schedule.remainingHours} />
        </section>

        <div className={`status-banner ${statusClass}`} role="status">
          <strong>{schedule.message}</strong>
          <span>Target: at least {TOTAL_HOURS} hours. Suggestions use {SHIFT_HOURS}-hour blocks.</span>
        </div>

        <section className="week-list" aria-label="Weekly hours">
          <div className="week-row week-heading">
            <span>Week</span>
            <span>Week of</span>
            <span>Intended hours</span>
            <span>App suggestion</span>
            <span>Status</span>
          </div>

          {schedule.weeks.map((week, index) => (
            <div className={`week-row ${week.status}`} key={week.week}>
              <div className="week-label">Week {week.week}</div>
              <div className="week-date">{weekOfLabels[index]}</div>
              <label className="hours-field">
                <span className="sr-only">Intended hours for week {week.week}</span>
                <input
                  aria-invalid={week.status === "invalid"}
                  inputMode="numeric"
                  min="0"
                  step="any"
                  type="number"
                  value={activeChunk.inputs[index]}
                  onChange={(event) => updateWeek(index, event.currentTarget.value)}
                  onInput={(event) => updateWeek(index, event.currentTarget.value)}
                />
              </label>
              <div className="suggestion">{week.suggestedHours === null ? "-" : `${week.suggestedHours} hrs`}</div>
              <div className="row-status">
                {week.error ?? (week.status === "entered" ? "Entered" : week.status === "suggested" ? "Suggested" : "Blank")}
              </div>
            </div>
          ))}
        </section>
      </section>
    </main>
  );
}

type SummaryItemProps = {
  label: string;
  value: number;
};

function SummaryItem({ label, value }: SummaryItemProps) {
  return (
    <div className="summary-item">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>hours</small>
    </div>
  );
}
