import { fireEvent, render, screen } from "@testing-library/react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "./accordion";

describe("Accordion", () => {
  it("uses opacity-driven transitions instead of expensive height animations", () => {
    const { container } = render(
      <Accordion type="single" collapsible>
        <AccordionItem value="item-1">
          <AccordionTrigger>Question</AccordionTrigger>
          <AccordionContent>Answer text</AccordionContent>
        </AccordionItem>
      </Accordion>,
    );

    const trigger = screen.getByRole("button", { name: /question/i });
    const content = container.querySelector('[role="region"]');

    expect(trigger).toBeInTheDocument();
    expect(content).not.toBeNull();
    expect(content).toHaveClass("transition-opacity");
    expect(content).not.toHaveClass("transition-all");
    expect(content).not.toHaveClass("animate-accordion-down");
    expect(content).not.toHaveClass("animate-accordion-up");
    expect(content).toHaveClass("data-[state=closed]:hidden");
    expect(content).toHaveAttribute("hidden");

    fireEvent.click(trigger);
    expect(screen.getByText("Answer text")).toBeVisible();
  });
});
