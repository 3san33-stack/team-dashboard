"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { CheckIcon, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  listPersonalTodos, createPersonalTodo, togglePersonalTodo, deletePersonalTodo,
} from "@/lib/supabase";
import type { Member, PersonalTodoItem } from "@/lib/types";

type Props = { member: Member };

export function PersonalTodo({ member }: Props) {
  const [items, setItems] = useState<PersonalTodoItem[]>([]);
  const [text, setText] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoaded(false);
    listPersonalTodos(member)
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setLoaded(true));
  }, [member]);

  async function add() {
    const trimmed = text.trim();
    if (!trimmed) return;
    setText("");
    try {
      const created = await createPersonalTodo(member, trimmed);
      setItems((prev) => [...prev, created]);
      setError(null);
    } catch {
      setText(trimmed);
      setError("저장하지 못했습니다. 다시 시도해 주세요.");
    }
  }

  async function toggle(item: PersonalTodoItem) {
    const nextDone = !item.done;
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, done: nextDone } : i)));
    await togglePersonalTodo(item.id, nextDone);
  }

  async function remove(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id));
    await deletePersonalTodo(id);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>개인 할 일</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex gap-2">
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add()}
            placeholder="할 일 추가"
            aria-label="할 일 추가"
          />
          <Button type="button" onClick={add}>
            추가
          </Button>
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
        {!loaded ? (
          <p className="text-sm text-muted-foreground">불러오는 중...</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground">할 일이 없습니다</p>
        ) : (
          <ul className="space-y-1">
            {items.map((item) => (
              <li key={item.id} className="flex items-center gap-2 rounded-md border p-2">
                <button
                  type="button"
                  onClick={() => toggle(item)}
                  aria-pressed={item.done}
                  aria-label={`${item.text} ${item.done ? "완료됨" : "완료 표시"}`}
                  className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-muted-foreground/40"
                >
                  <motion.span
                    initial={false}
                    animate={{ scale: item.done ? 1 : 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  >
                    <CheckIcon className="h-3 w-3" />
                  </motion.span>
                </button>
                <span
                  className={`min-w-0 flex-1 truncate text-sm ${
                    item.done ? "text-muted-foreground line-through" : ""
                  }`}
                >
                  {item.text}
                </span>
                <button
                  type="button"
                  onClick={() => remove(item.id)}
                  aria-label={`${item.text} 삭제`}
                  className="shrink-0 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
