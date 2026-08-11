"use client";

import { motion } from "motion/react";
import { Card, CardContent } from "@/components/ui/card";
import { MEMBERS, type Member } from "@/lib/types";

type Props = { onSelect: (member: Member) => void };

export function MemberSelect({ onSelect }: Props) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6">
      <h1 className="text-2xl font-semibold">누구신가요?</h1>
      <div className="flex flex-wrap justify-center gap-4">
        {MEMBERS.map((member, i) => (
          <motion.div
            key={member}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            whileHover={{ y: -4 }}
          >
            <Card
              className="w-32 cursor-pointer text-center transition-shadow hover:shadow-lg"
              onClick={() => onSelect(member)}
            >
              <CardContent className="py-6 text-lg font-medium">{member}</CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
