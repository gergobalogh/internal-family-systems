/**
 * Act 2's Fears question (frame A10) waits for an IFS-trained therapist's
 * review (project.md, 2026-11-02). Until then it is off; `?fears` turns it
 * on, to try it or show it to the reviewer.
 */
export const fearsRequested = new URLSearchParams(window.location.search).has('fears')
