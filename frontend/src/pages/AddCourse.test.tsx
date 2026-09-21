import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AddCourse from "./AddCourse";

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: { id: "u1", role: "instructor" },
    profile: {
      id: "u1",
      email: "teacher@example.com",
      displayName: "Teacher",
      role: "instructor",
      createdAt: "2024-01-01T00:00:00.000Z",
    },
  }),
}));

vi.mock("@/contexts/LanguageContext", () => ({
  useLanguage: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

vi.mock("@/components/ImageUpload", () => ({
  default: ({ value, onChange, label }: any) => (
    <input
      aria-label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  ),
}));

vi.mock("@/components/VideoUpload", () => ({
  default: ({ value, onChange, label }: any) => (
    <input
      aria-label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  ),
}));

it("shows the free intro video fields on the create course form", () => {
  render(
    <MemoryRouter>
      <AddCourse />
    </MemoryRouter>,
  );

  expect(screen.getByText("Free intro video (optional)")).toBeInTheDocument();
  expect(screen.getByText("Intro title (optional)")).toBeInTheDocument();
});
