# AGENTS

This document defines agent behaviour for PESOS. Each agent must consult the system's files **before**, **during**, and **after** doing work.

---

## 🧠 Agent Protocol

1. **Start with `end_state.md`**

   - Understand what the project is ultimately trying to become.
   - If `end_state.md` is missing or vague, log uncertainty and/or request clarity.

2. **Check `todo.md`**

   - See if there are tasks already defined.
   - Add, complete, or reprioritise tasks if appropriate.

3. **Log to `chronicler.md`**

   - Every meaningful action must be written as a short update.
   - Include what was done, why, and whether it moved the system closer to the end state.

4. **Always work backward from desired state**
   - Don't generate tasks arbitrarily. Think in terms of outcomes.
   - Only output what is required _next_ to make progress.

---

## 📁 Referenced Files

- `end_state.md` → defines the ideal future
- `todo.md` → lists current execution plan
- `chronicler.md` → tracks what's already happened

---

## 🧪 Example Invocation

> Agent invoked to "work on PESOS UI"

1. `end_state.md`: notes that UI should be clean, mobile-friendly, taggable
2. `todo.md`: sees task "Create tag UI"
3. Begins task → adds working note to `chronicler.md`
4. Updates `todo.md` to reflect partial or full progress
