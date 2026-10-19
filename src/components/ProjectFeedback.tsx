import { JB_STUDY_NOTE, PROJECT_FEEDBACK_URL, PROJECT_GITHUB_URL } from '@/lib/projectFeedback';

export function ProjectFeedbackLink() {
  return (
    <a href={PROJECT_FEEDBACK_URL} target="_blank" rel="noopener noreferrer"
      className="inline-block rounded text-sm font-semibold text-primary underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      Suggest a correction or improvement on GitHub
    </a>
  );
}

export function ProjectFeedbackNote() {
  return (
    <section id="project-feedback" aria-label="A note from JB and project feedback" className="space-y-3" data-testid="project-feedback-note">
      <p className="text-sm leading-6 text-muted-foreground">{JB_STUDY_NOTE} <span className="whitespace-nowrap">— JB</span></p>
      <ProjectFeedbackLink />
      <p className="text-xs leading-5 text-muted-foreground">GitHub feedback is public. Leave out private reflections and personal details.</p>
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
        <a href={PROJECT_GITHUB_URL} target="_blank" rel="noopener noreferrer" className="rounded underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">View the project on GitHub</a>
        <span aria-hidden="true">·</span>
        <a href="https://www.biblegateway.com/versions/new-living-translation-nlt-bible/" target="_blank" rel="noopener noreferrer" className="rounded underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">About the NLT Bible translation</a>
      </div>
    </section>
  );
}
