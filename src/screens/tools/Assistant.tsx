import { RotateCcw } from "lucide-react";
import { Page } from "@/components/layout/Page";
import { ChatThread, Composer } from "@/components/assistant/Chat";
import { useAssistant } from "@/lib/assistant";

/** Full-screen version of the assistant. The floating button opens the same chat anywhere. */
export function Assistant() {
  const a = useAssistant();
  return (
    <Page
      title="Ask KiwiPath"
      back={{ to: "/tools", label: "Tools" }}
      lead="Questions about visas, study, jobs, money or settling in. It can also set things up for you, like your arrival date and document dates."
      actions={
        a.chat.length > 0 ? (
          <button type="button" onClick={a.clear} className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-subhead font-semibold text-teal-ink" aria-label="Start a new chat">
            <RotateCcw className="size-4" aria-hidden />
            New
          </button>
        ) : undefined
      }
    >
      <div className="flex min-h-[55dvh] flex-col pb-36 lg:pb-28">
        <ChatThread a={a} />
      </div>
      <div className="fixed inset-x-0 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-30 gutter-x pb-2 lg:bottom-4 lg:left-72">
        <div className="mx-auto max-w-3xl">
          <Composer a={a} />
        </div>
      </div>
    </Page>
  );
}
