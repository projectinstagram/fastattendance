import { requireStudent } from "@/lib/auth";
import { resolveSessionByCode, resolveSessionByToken } from "@/lib/attendance-session";
import JoinConfirm from "./JoinConfirm";

export default async function JoinPage({
  searchParams,
}: {
  searchParams: { session?: string; token?: string; code?: string };
}) {
  const { profile, student } = await requireStudent();

  const resolution =
    searchParams.code && !searchParams.session
      ? await resolveSessionByCode(searchParams.code)
      : searchParams.session && searchParams.token
      ? await resolveSessionByToken(searchParams.session, searchParams.token)
      : null;

  if (!resolution || !resolution.ok) {
    const message =
      resolution && !resolution.ok && resolution.reason === "EXPIRED_QR"
        ? "This QR code has expired. Ask your teacher for the current one."
        : "This attendance session could not be found or is no longer active.";
    return (
      <div className="mx-auto max-w-md px-6 py-20 text-center">
        <div className="mx-auto mb-4 h-10 w-10 rounded-full bg-signal-absent/10 text-signal-absent">
          <span className="flex h-full items-center justify-center text-lg">!</span>
        </div>
        <h1 className="font-display text-xl font-semibold text-ink-950">Can't join this session</h1>
        <p className="mt-2 text-sm text-ink-700">{message}</p>
      </div>
    );
  }

  const { session, classRow, teacherName } = resolution;

  return (
    <JoinConfirm
      session={session}
      classRow={classRow}
      teacherName={teacherName}
      studentName={profile.name}
      rollNumber={student.roll_number}
      email={profile.email}
      token={searchParams.token}
      code={searchParams.code}
      requireLocation={session.require_location}
    />
  );
}
