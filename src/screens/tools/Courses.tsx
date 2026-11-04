import { useState } from "react";
import { ArrowUpRight, CalendarClock, Pencil, Plus, Trash2 } from "lucide-react";
import { Page } from "@/components/layout/Page";
import { Card, Notice, SectionHeader, Tag } from "@/components/ui/Bits";
import { Button } from "@/components/ui/Button";
import { Select, TextField } from "@/components/ui/Controls";
import { ListGroup, ListRow } from "@/components/ui/List";
import { AlertDialog, Sheet } from "@/components/ui/Sheet";
import { toast } from "@/components/ui/Toast";
import { UNIVERSITIES } from "@/data/places";
import { formatLkr, formatNzd, uid } from "@/lib/format";
import { useRate } from "@/lib/rates";
import { useApp } from "@/store/app";
import type { Course, CourseStatus } from "@/types";

const STATUS: Record<CourseStatus, { label: string; tint: "malibu" | "gold" | "green" | "teal" | "coral" }> = {
  researching: { label: "Researching", tint: "malibu" },
  applied: { label: "Applied", tint: "gold" },
  offer: { label: "Offer received", tint: "green" },
  accepted: { label: "Accepted", tint: "teal" },
  declined: { label: "Declined", tint: "coral" },
};

const EMPTY: Omit<Course, "id"> = { university: UNIVERSITIES[0].name, programme: "", intake: "", feeNzd: 0, ielts: 6.5, deadline: "", status: "researching" };

export function Courses() {
  const shortlist = useApp((s) => s.shortlist);
  const upsertCourse = useApp((s) => s.upsertCourse);
  const removeCourse = useApp((s) => s.removeCourse);
  const rate = useRate();
  const [editing, setEditing] = useState<Course | null>(null);
  const [confirm, setConfirm] = useState<Course | null>(null);

  const sorted = [...shortlist].sort((a, b) => (a.deadline || "9999").localeCompare(b.deadline || "9999"));

  return (
    <Page
      title="Course Shortlist"
      back={{ to: "/tools", label: "Tools" }}
      lead="Compare Masters programmes side by side. Copy fees and entry scores from each university's own programme page."
    >
      <div className="flex flex-col gap-6">
        <Button onClick={() => setEditing({ id: uid("course"), ...EMPTY })} icon={<Plus className="size-5" aria-hidden />}>
          Add a programme
        </Button>

        {sorted.length === 0 ? (
          <Card className="p-6 text-center">
            <p className="text-headline font-semibold">No programmes yet</p>
            <p className="mt-1 text-subhead text-label-2">Add three programmes to compare fees, intakes and English requirements.</p>
          </Card>
        ) : (
          <section aria-labelledby="shortlist" className="flex flex-col gap-3">
            <SectionHeader id="shortlist" title={`Your shortlist (${sorted.length})`} />
            <div className="relative -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
              <table className="w-full min-w-[34rem] overflow-hidden rounded-tile bg-surface text-left text-subhead shadow-card">
                <thead className="bg-fill text-footnote text-label-2">
                  <tr>
                    <th scope="col" className="px-4 py-2.5 font-semibold">Programme</th>
                    <th scope="col" className="px-3 py-2.5 text-right font-semibold">Fee / year</th>
                    <th scope="col" className="px-3 py-2.5 text-right font-semibold">IELTS</th>
                    <th scope="col" className="px-3 py-2.5 font-semibold">Deadline</th>
                    <th scope="col" className="px-3 py-2.5"><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((c) => (
                    <tr key={c.id} className="border-t border-sep align-top">
                      <td className="px-4 py-3">
                        <p className="font-semibold">{c.programme || "Untitled programme"}</p>
                        <p className="text-footnote text-label-2">{c.university}</p>
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          <Tag tint={STATUS[c.status].tint} solid={false} className="text-caption">{STATUS[c.status].label}</Tag>
                          {c.intake && <span className="text-caption text-label-2">Intake {c.intake}</span>}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-right tabular">
                        {c.feeNzd ? (
                          <>
                            <p className="font-semibold">{formatNzd(c.feeNzd)}</p>
                            <p className="text-caption text-label-2">{formatLkr(c.feeNzd * rate.lkrPerNzd)}</p>
                          </>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-3 py-3 text-right tabular">{c.ielts ? c.ielts.toFixed(1) : "—"}</td>
                      <td className="px-3 py-3 tabular">{c.deadline ? new Date(c.deadline).toLocaleDateString("en-NZ", { day: "numeric", month: "short", year: "numeric" }) : "—"}</td>
                      <td className="px-2 py-2">
                        <div className="flex">
                          <button type="button" onClick={() => setEditing(c)} className="grid size-11 place-items-center rounded-full hover:bg-fill" aria-label={`Edit ${c.programme || "programme"}`}>
                            <Pencil className="size-4" aria-hidden />
                          </button>
                          <button type="button" onClick={() => setConfirm(c)} className="grid size-11 place-items-center rounded-full text-coral-ink hover:bg-fill" aria-label={`Remove ${c.programme || "programme"}`}>
                            <Trash2 className="size-4" aria-hidden />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {sorted[0]?.deadline && (
              <p className="flex items-center gap-2 px-1 text-subhead text-label-2">
                <CalendarClock className="size-4" aria-hidden /> Next deadline: {sorted[0].programme || sorted[0].university}
              </p>
            )}
          </section>
        )}

        <ListGroup header="New Zealand's universities" footer="Programme fees, intakes and entry requirements are on each university's website.">
          {UNIVERSITIES.map((u) => (
            <ListRow key={u.id} title={u.name} subtitle={u.city} href={u.href} accessory={<ArrowUpRight className="size-4 text-label-3" aria-hidden />} />
          ))}
        </ListGroup>

        <Notice>
          Not every qualification leads to a post-study work visa. Before paying a deposit, check that your programme and study length meet the current
          rules on immigration.govt.nz.
        </Notice>
      </div>

      <CourseSheet
        course={editing}
        onClose={() => setEditing(null)}
        onSave={(c) => {
          upsertCourse(c);
          toast("Programme saved");
          setEditing(null);
        }}
      />
      <AlertDialog
        open={confirm !== null}
        title="Remove this programme?"
        message={confirm ? `${confirm.programme || "This programme"} will be removed from your shortlist.` : ""}
        confirmLabel="Remove"
        destructive
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          if (confirm) removeCourse(confirm.id);
          setConfirm(null);
        }}
      />
    </Page>
  );
}

function CourseSheet({ course, onClose, onSave }: { course: Course | null; onClose: () => void; onSave: (c: Course) => void }) {
  return (
    <Sheet open={course !== null} onClose={onClose} title={course?.programme ? "Edit programme" : "Add a programme"} size="tall">
      {course && <CourseForm key={course.id} initial={course} onSave={onSave} />}
    </Sheet>
  );
}

function CourseForm({ initial, onSave }: { initial: Course; onSave: (c: Course) => void }) {
  const [c, setC] = useState(initial);
  const set = (patch: Partial<Course>) => setC((prev) => ({ ...prev, ...patch }));
  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        onSave(c);
      }}
    >
      <Select label="University" value={c.university} onChange={(e) => set({ university: e.target.value })}>
        {UNIVERSITIES.map((u) => (
          <option key={u.id} value={u.name}>
            {u.name}
          </option>
        ))}
      </Select>
      <TextField label="Programme" placeholder="e.g. Master of Data Science" required value={c.programme} onChange={(e) => set({ programme: e.target.value })} data-autofocus />
      <div className="grid grid-cols-2 gap-3">
        <TextField label="Intake" placeholder="July 2027" value={c.intake} onChange={(e) => set({ intake: e.target.value })} />
        <TextField label="Application deadline" type="date" value={c.deadline} onChange={(e) => set({ deadline: e.target.value })} />
        <TextField label="Fee per year (NZ$)" inputMode="numeric" value={c.feeNzd ? String(c.feeNzd) : ""} onChange={(e) => set({ feeNzd: Number(e.target.value.replace(/[^\d]/g, "")) || 0 })} />
        <TextField label="IELTS overall" inputMode="decimal" value={c.ielts ? String(c.ielts) : ""} onChange={(e) => set({ ielts: Math.min(9, Number(e.target.value.replace(/[^\d.]/g, "")) || 0) })} />
      </div>
      <Select label="Status" value={c.status} onChange={(e) => set({ status: e.target.value as CourseStatus })}>
        {Object.entries(STATUS).map(([value, s]) => (
          <option key={value} value={value}>
            {s.label}
          </option>
        ))}
      </Select>
      <Button type="submit" block>
        Save programme
      </Button>
    </form>
  );
}
