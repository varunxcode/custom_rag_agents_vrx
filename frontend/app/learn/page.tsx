import Link from "next/link";

const SCREENSHOTS = [
  { alt: "Screenshot 1", src: "https://github.com/user-attachments/assets/ce82941b-f2d1-40c0-a6f0-8950b646ec4e" },
  { alt: "Screenshot 2", src: "https://github.com/user-attachments/assets/e2cac181-cee5-4fa5-9b8c-5ae37f1c9892" },
  { alt: "Screenshot 3", src: "https://github.com/user-attachments/assets/26bfc684-4ce8-44c5-bc4a-6205715abfe1" },
  { alt: "Screenshot 4", src: "https://github.com/user-attachments/assets/45b98d74-4a75-497d-ad5b-28aa06132bfe" },
  { alt: "Screenshot 5", src: "https://github.com/user-attachments/assets/b18e8fbc-152e-4a01-9ff8-9bab0f54b6aa" },
  { alt: "Screenshot 6", src: "https://github.com/user-attachments/assets/34484411-9628-4d54-8102-652de9de7a44" },
];

export default function LearnPage() {
  return (
    <main className="mx-auto max-w-2xl p-6">
      <Link
        href="/spaces"
        className="mb-6 inline-block rounded border px-3 py-2 text-sm hover:bg-[#ff4400] hover:text-white"
      >
        ← go back
      </Link>

      <h1 className="mb-6 text-xl font-semibold">How to use this</h1>

      <div className="flex flex-col gap-8">
        {SCREENSHOTS.map((shot) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={shot.src}
            src={shot.src}
            alt={shot.alt}
            className="h-[500px] w-full rounded border object-contain"
          />
        ))}
      </div>
    </main>
  );
}
