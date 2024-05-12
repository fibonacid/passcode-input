## Custom OTP inputs are dumb. Here is how to build one.

As a developer I don't like OTP inputs because they are complicated to build and not clearly defined by a standard.

If I had to choose a single solution to deal with OTPs for the rest of my life I would do this:

```html
<input type="text" autocomplete="one-time-password" />
```

It's simple, reliable and well integrated with the browser/os.
Someone on Twitter said that whoever implemented the OTP suggestion on Safari deserves a promotion and I agree.

On the other end, One Time Passwords are annoying and confusing to the end users, therefore it might be good to show them a special kind of input to make the experience feel more familiar.

Let's see how we can create a PassCode component in React in less then 200 lines of code.

## API Design

I want my component to handle the behavior of an OTP input but allow me to control the styling. Here is how i want to interact with the component:

```tsx
import { Passcode } from "./passcode";

function OTPInput() {
  return (
    <Passcode>
      <Passcode.Input />
      <Passcode.Input />
      <Passcode.Input />
      <Passcode.Input />
    </Passcode>
  );
}
```

Why do i want to manually add the input elements?
Because i want to control how many digits are required and also how to style the individual inputs.

Here is how i would apply basic styles with TailwindCSS:

```tsx
<Passcode className="flex gap-2">
  <Passcode.Input className="w-8 h-8 text-2xl text-center" />
</Passcode>
```

Let's create the component module now. First we need to establish a way to synchronize the `Passcode` component with its children.
One solution would be to create a hook that returns utility functions.

```tsx
const NUMBER_OF_DIGITS = 4;

function OTPInput() {
  const { parentProps, childProps } = usePasscodeState({
    numberOfDigits: NUMBER_OF_DIGITS,
    alphanumeric: true,
  });
  const children = new Array.from({ lenght: NUMBER_OF_DIGITS }).fill(
    (_, index) => <Passcode.Input key={index} {...childProps(index)} />
  );
  return <Passcode {...parentProps}>{children}</Passcode>;
}
```

This is probably the most idiomatic way to do it, but I would like to avoid wiring everyting up manually.
We can leverage React context + the Children utility to have the same effect, without having to wire up things manually.

Context allows us to pass a props to the `Passcode` component and read from the child components.
These props will be shared by every input component regardless of their position in the array.

```tsx
// passcode.tsx
import * as React from "react";

interface ContextValue = {
    alphanumeric?: boolean;
}

const PasscodeContext = React.createContext<ContextValue>({});

export interface PasscodeProps extends ContextValue {
    className?: string;
    children: ReactNode[];
}

export function Passcode(props: PasscodeProps) {
  const { className, children, ...context } = props;

  return (
    <PassCodeContext.Provider value={context}>
      {children}
    </PasscodeContext>
  )
}

export function PasscodeInput() {
    const { alphanumeric } = React.useContext(PasscodeContext)!;
    return <input inputMode={context.alphanumeric ? "text" : "numeric"} />
}
```

With the `Children` helper we can pass props that should be different for every input.
For example, let's add a `data-index` attribute based on the position of the component in the `children` array.

```tsx
export function Passcode(props: PasscodeProps) {
  const { className, children, ...context } = props;

  const inputs = React.Children.map((child, index) => {
    const jsx = child as JSX.Element;
    return React.cloneElement<PasscodeInputProps>(jsx, {
        key: index,
        index,
    });
  });

  return (
    <PasscodeContext.Provider value={context}>
      {inputs}
    </PasscodeContext>
  )
}

export interface PasscodeInputProps {
    index?: number;
}

export function PasscodeInput(props: PasscodeInputProps) {
    const context = React.useContext(PasscodeContext)!;

    return (
        <input inputMode={context.alphanumeric ? "text" : "numeric"} data-index={props.index} />
    )
}
```

As you can see, we are using `React.cloneElement` to pass additional props to our children.
Essentially, we can avoid doing this:

```tsx
<Passcode>
  <Passcode index={0} />
  <Passcode index={1} />
  <Passcode index={2} />
  <Passcode index={3} />
</Passcode>
```

To improve our code we can add a check to see if the passed children is actually a `PasscodeInput` component.

```tsx
const inputs = React.Children.map((child, index) => {
  const jsx = child as JSX.Element;
  if (jsx.type !== PasscodeInput) return null;
  return React.cloneElement<PasscodeInputProps>(element, {
    key: index,
    index,
  });
});
```

Now that we have found a solution to make our API design work, let's implement the behavior of the `Passcode` component.

## Implementation

As mentioned in the intro, the behavior of an OTP input is complicated, let's divide this into chunks.

### Storing the code

To track the code input we need to store its value over time.
Let's store the value as an array of strings where each item is a digit of the code:

```tsx
const [code, setCode] = React.useState<string[]>([]);
```

Since passcode inputs should have a fixed length, i would modify this a little bit.
Let's extract the number of digits by counting the children:

```tsx
const numberOfDigits = React.Children.count(children);
const [code, setCode] = React.useState<string>(
  Array.from({ length: numberOfDigits }, () => "")
);
```

Having defined the number of digits allows us to pre-fill the code with empty string.
This is important because when we assign the digit to the `input` element we cannot pass it an `undefined` value, otherwise the component should switch from being uncontrolled to controlled on the first input.

I haven't tested if this is actually needed, but it might be better to prevent the number of children to change between renders. To achieve this we can wrap number of digits in a `useState`.
The value will always be the one from the first render:

```tsx
const [numberOfDigits] = React.useState(
  React.Children.count(children);
)
```

### Tracking user input

To track user input we can use the `onKeydown` event from React. This event will fire for every keystroke, including the `Backspace` key that will be useful later. Let's define a handler and passit along with the input value.

```tsx
const handleKeyDown = React.useCallback<KeynoardEventHandler>((event) => {
  /* ... */
});

const inputs = React.Children.map((child, index) => {
  /* ... */
  return React.cloneElement<PasscodeInputProps>(element, {
    /* ... */
    handleKeyDown,
    value: code[index],
  });
});
```

The `PasscodeInput` should simply pass both props to the `input` element:

```tsx
export interface PasscodeInputProps {
  /* ... */
  onKeydown?: KeyboardEventHandler;
  value?: string;
}

export function PasscodeInput(props: PasscodeInputProps) {
  /* ... */

  return (
    <input
      {/* ... */}
      onKeyDown={props.onKeydown!}
      value={props.value!}
    >
  )
}
```

Let's dive into the `handleKeydown` function implementation.
The main responsibility is to read the key pressed and modify the state when necessary.

```tsx
const handleKeyDown = React.useCallback<KeynoardEventHandler>((event) => {
  const target = event.target as HTMLInputElement;
  const index = Number(target.dataset.index);
  const keyPressed = event.key;

  setCode((prev) => {
    const next = [...prev];
    next[index] = keyPressed;
    return next;
  });
});
```

Let's handle the backspace key now:

```tsx
/* ... */
const isBackspace = keypressed === "Backspace";

if (isBackspace) {
  setCode((prev) => {
    const next = [...prev];
    next[index] = "";
    if (index > 0) next[index - 1] = "";
    return next;
  });
} else {
  /* ... */
}
```

Finally, let's protect us from unwanted keys:

```tsx
// default US-104-QWERTY keyboard
const invalidKeys = [
  " ",
  "!",
  "#",
  "$",
  "%",
  "&",
  "(",
  ")",
  "*",
  "@",
  "Alt",
  "AltGraph",
  "ArrowDown",
  "ArrowUp",
  "Backspace",
  "CapsLock",
  "Control",
  "Delete",
  "End",
  "Enter",
  "Escape",
  "Fn",
  "Home",
  "Meta",
  "OS",
  "PageDown",
  "PageUp",
  "Shift",
  "Symbol",
  "Tab",
  "^",
];

/* ... */

const handleKeyDown = React.useCallback<KeynoardEventHandler>((event) => {
  if (invalidKeys.includes(event.key)) return;
  /* ... */
});
```

### Managing input focus

OTP inputs are expected to move focus automatically to the next area after a digit is inserted.
We can achieve this by defining a utility function called `moveFocus` and use it inside our `onKeydown` handler.

First, let's attach a ref to the wrapping div of the `Passcode` component:

```tsx
export function PassCode(props: PassCodeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  /* ... */

  return (
    <div ref={containerRef}>
      <PasscodeContext.Provider value={context}>
        {inputs}
      </PasscodeContext>
    </div>
  )
}
```

Now, let's define the utility as a function that receives an index number, retrieves the dom node and calls `focus` on it:

```tsx
const moveFocus = useCallback((index: number) => {
  const next = containerRef.current?.children[index];
  if (next instanceof HTMLInputElement) next.focus();
});
```

And now, let's move focus to the next input when a key is inserted, and to the prev element when the key is backspace:

```tsx
if (isBackspace) {
  moveFocus(index - 1);
  // ...
} else {
  moveFocus(index + 1);
  // ...
}
```

### Enabling Copy and Paste

To allow copy and paste we can use the `onPaste` event from React.
Same as before, we create the callback on the parent and pass it to the children, which in turn should pass it to the input element.

The `handlePaste` function should grab the text with `event.clipboardData` and call `setCode` accordingly:

```tsx
const handlePaste = useCallback<ClipboardEventHandler>(
  (event) => {
    event.preventDefault();
    const target = event.target as HTMLInputElement;
    const index = Number(target.dataset.index);

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
```

One thing to not is that in order to make `CTRL` or `CMD+V` work we need to make sure that when the combination of keys is pressed, the `handleKeydown` isn't preventing the default behavior of the browser:

```tsx
const handleKeyDown = React.useCallback<KeynoardEventHandler>((event) => {
  if (event.metaKey && event.key.toLowerCase() === "v") return;
  event.preventDefault();
});
```

Not sure what good does it make to call `event.preventDefault` anyways, but if you call it, make sure it doesn't happen while pasting.

### Adding accessibility labels

One reason why custom OTP inputs are dumb is that since the input is split into multiple elements, the screenreader experience tends to be pydantic.
Maybe there is a better solution, here is how I would approach this.

```tsx
const labels = [
  "First input digit",
  "Second input digit",
  // ...
];

export function PassCodeInput(props: PassCodeInputProps) {
  // ...
  const id = `passcode-input-${props.index}`;
  const label = labels[props.index];

  return (
    <>
      <label htmlFor={id}>{label}</label>
      <input id={id} {/* ... */} />
    </>
  );
}
```

If you wanna go through the accessibility rabbit hole there are more things to consider.
I would probably make sure to add some context on the page to let the user know what these input digits are about.

```tsx
<h1>Enter verification code</h1>
<Passcode>
  {/* ... */}
</Passcode>
```

### Validating the input

How you validate the input can vary, but overall you could add an `onComplete` callback to the `Passcode` component and call it when the `onKeyDown` or `onPaste` handlers have set the last digit.

```tsx
export interface PasscodeProps {
  // ...
  onComplete?: (code: string) => void;
}

export function PassCode(props: PassCodeProps) {
  // ...

  const handleKeyDown = () => {
    ///...
    if (index === numberOfDigits - 1) {
      props.onComplete?.(code.join(""));
    }
  };

  const handlePaste = () => {
    // ...
    if (next.every((digit) => digit !== "")) {
      props.onComplete?.(code.join(""));
    }
  };
}
```

If validation is async (likely) you can add an isValidating prop to the `Passcode` component and disable the inputs when is set to true. Allowing you to do something like this on:

```tsx
import { Passcode } from "./passcode";
import * as React from "react";

async function validate(code: string) {
  const response = await fetch("https://backend.app.com/auth?code=" + code);
  return response.ok;
}

function OTPInput() {
  const [isValidating, setIsValidating] = useState(false);
  const handleComplete = React.useCallback((code: string) => {
    validate(code).then().catch(console.error);
  }, []);

  return (
    <Passcode onComplete={handleComplete} isValidating={isValidating}>
      <Passcode.Input />
      <Passcode.Input />
      <Passcode.Input />
      <Passcode.Input />
    </Passcode>
  );
}
```

## Conslusions

In this article i have left out aspects of the behavior that are subjective.
For a full review of the code refer to the [github repository](https://github.com/fibonacid/passcode-input).
