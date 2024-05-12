import React, {
  CSSProperties,
  Children,
  ClipboardEventHandler,
  KeyboardEventHandler,
  ReactElement,
  ReactNode,
  cloneElement,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";

export type PassCodeContextValue = {
  numberOfDigits: number;
  alphanumeric: boolean;
};

const PassCodeContext = React.createContext<PassCodeContextValue | null>(null);

export function usePassCodeContext() {
  const context = useContext(PassCodeContext);
  if (!context) {
    throw new Error(
      "usePassCodeContext must be used within a PassCode component"
    );
  }
  return context;
}

export interface PassCodeProps {
  children: React.ReactNode[];
  className?: string;
  style?: CSSProperties;
  alphanumeric?: boolean;
}

export function PassCode(props: PassCodeProps) {
  const { children, className, alphanumeric = true, style } = props;
  const containerRef = useRef<HTMLDivElement>(null);

  // The digit count should not change after the component mounts
  const [numberOfDigits] = useState(Children.count(children));
  const [code, setCode] = useState<string[]>(
    Array.from({ length: numberOfDigits }, () => "")
  );

  const moveFocus = useCallback(
    (index: number) => {
      const next = containerRef.current?.children[index];
      if (next instanceof HTMLInputElement) next.focus();
    },
    [containerRef]
  );

  const handlePaste = useCallback<ClipboardEventHandler>(
    (event) => {
      event.preventDefault();
      const target = event.target as HTMLInputElement;
      const index = Number(target.dataset.index);
      if (index === undefined || isNaN(index)) return;

      const pasted = event.clipboardData.getData("text");
      const length = pasted.length;

      if (length >= numberOfDigits) {
        moveFocus(numberOfDigits - 1);
        setCode(Array.from(pasted.slice(0, numberOfDigits)));
      } else {
        moveFocus(index + length);
        const next = [...code];
        for (let i = index; i < numberOfDigits; i++) {
          next[i] = pasted[i - index] ?? "";
        }
        setCode(next);
      }
    },
    [setCode, moveFocus, numberOfDigits, code]
  );

  const handleKeyDown = useCallback<KeyboardEventHandler>(
    (event) => {
      if (event.metaKey && event.key === "v") return;
      if (event.metaKey) return;
      event.preventDefault();

      const target = event.target as HTMLInputElement;
      const index = Number(target.dataset.index);
      if (index === undefined) {
        throw new Error("PassCode.Input must have a data-index attribute");
      }
      const keyPressed = event.key;
      const isBackspace = keyPressed === "Backspace";

      if (isBackspace) {
        moveFocus(index - 1);
        setCode((prev) => {
          const next = [...prev];
          next[index] = "";
          if (index > 0) next[index - 1] = "";
          return next;
        });
      } else if (keyPressed.length === 1) {
        moveFocus(index + 1);
        setCode((prev) => {
          const next = [...prev];
          next[index] = keyPressed;
          return next;
        });
      }
    },
    [setCode, code]
  );

  const renderChild = useCallback(
    (child: ReactNode, index: number) => {
      const jsx = child?.valueOf() as JSX.Element;
      if (jsx.type !== PassCodeInput) {
        throw new Error("PassCode children must be PassCode.Input components");
      }
      return cloneElement<PassCodeInputProps>(child as ReactElement, {
        key: index,
        index,
        onKeyDown: handleKeyDown,
        onPaste: handlePaste,
        value: code[index],
      });
    },
    [numberOfDigits, handleKeyDown, code]
  );

  return (
    <PassCodeContext.Provider
      value={{
        numberOfDigits,
        alphanumeric,
      }}
    >
      <div className={className} style={style} ref={containerRef}>
        {Children.map(children, renderChild)}
      </div>
    </PassCodeContext.Provider>
  );
}

export interface PassCodeInputProps {
  className?: string;
  index?: number;
  onKeyDown?: KeyboardEventHandler;
  onPaste?: ClipboardEventHandler;
  value?: string;
  style?: CSSProperties;
}

export function PassCodeInput({
  className,
  value,
  onKeyDown,
  onPaste,
  index,
  style,
}: PassCodeInputProps) {
  const context = usePassCodeContext();
  return (
    <input
      className={className}
      maxLength={1}
      autoComplete="off"
      autoCapitalize="off"
      autoCorrect="off"
      spellCheck={false}
      inputMode={context.alphanumeric ? "text" : "numeric"}
      value={value}
      onKeyDown={onKeyDown}
      onChange={(event) => event.preventDefault()}
      onPaste={onPaste}
      data-index={index}
      style={style}
    />
  );
}

PassCode.Input = PassCodeInput;
