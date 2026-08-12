"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { CheckIcon, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { Member } from "@/lib/types";

type TodoItem = { id: string; text: string; done: boolean };

type Props = { member: Member };

function storageKey(member: Member) {
  return `team-dashboard:todo:${member}`;
}

export function PersonalTodo({ member }: Props) {
  const [items, setItems] = useState<TodoItem[]>([]);
  const [text, setText] = useState("");

  useEffect(() => {
    const raw = localStorage.getItem(storageKey(member));
    setItems(raw ? JSON.parse(raw) : []);
  }, [member]);

  function persist(next: TodoItem[]) {
    setItems(next);
    localStorage.setItem(storageKey(member), JSON.stringify(next));
  }

  function add() {
    const trimmed = text.trim();
    if (!trimmed) return;
    persist([...items, { id: crypto.randomUUID(), text: trimmed, done: false }]);
    setText("");
  }

  function toggle(id: string) {
    persist(items.map((i) => (i.id === id ? { ...i, done: !i.done } : i)));
  }

  function remove(id: string) {
    persist(items.filter((i) => i.id !== id));
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
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">할 일이 없습니다</p>
        ) : (
          <ul className="space-y-1">
            {items.map((item) => (
              <li key={item.id} className="flex items-center gap-2 rounded-md border p-2">
                <button
                  type="button"
                  onClick={() => toggle(item.id)}
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
