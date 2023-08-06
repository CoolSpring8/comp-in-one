import { act, cleanup, render } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, test } from "vitest";
import { Comp, MComp } from "./index.js";

afterEach(() => {
  cleanup();
});

describe("<Comp /> renders", () => {
  test("should not render with no children", () => {
    // @ts-expect-error ts(2741)
    expect(() => render(<Comp />)).toThrow("props.children is not a function");
  });

  test("should not render with non-function children", () => {
    // @ts-expect-error ts(2747)
    expect(() => render(<Comp>foo</Comp>)).toThrow(
      "props.children is not a function"
    );
  });

  test("should render with function children", () => {
    const { container } = render(
      <Comp>{() => <div data-testid="foo">foo</div>}</Comp>
    );

    expect(container).toMatchInlineSnapshot(`
      <div>
        <div
          data-testid="foo"
        >
          foo
        </div>
      </div>
    `);
  });

  test("can be nested", () => {
    const { container } = render(
      <Comp>{() => <Comp>{() => <div data-testid="foo">foo</div>}</Comp>}</Comp>
    );

    expect(container).toMatchInlineSnapshot(`
      <div>
        <div
          data-testid="foo"
        >
          foo
        </div>
      </div>
    `);
  });
});

describe("<Comp /> with hooks inside children function", () => {
  test("useState", () => {
    const { getByTestId, getByText } = render(
      <Comp>
        {() => {
          const [count, setCount] = React.useState(0);
          return (
            <div>
              <div data-testid="count">{count}</div>
              <button onClick={() => setCount((c) => c + 1)}>+</button>
            </div>
          );
        }}
      </Comp>
    );

    expect(getByTestId("count").innerText).toBe("0");

    act(() => {
      getByText("+").click();
    });

    expect(getByTestId("count").innerText).toBe("1");
  });

  test("useRef", () => {
    const { getByTestId } = render(
      <Comp>
        {() => {
          const ref = React.useRef("foo");
          return <div data-testid="ref">{ref.current}</div>;
        }}
      </Comp>
    );

    expect(getByTestId("ref").innerText).toBe("foo");
  });

  test("useEffect", () => {
    const { getByTestId } = render(
      <Comp>
        {() => {
          const [count, setCount] = React.useState(0);
          React.useEffect(() => {
            setCount(1);
          }, []);
          return (
            <div>
              <div data-testid="count">{count}</div>
            </div>
          );
        }}
      </Comp>
    );

    expect(getByTestId("count").innerText).toBe("1");
  });
});

describe("<Comp /> with return values of hooks passing down", () => {
  test("useState", () => {
    const App = () => {
      const [count, setCount] = React.useState(0);
      return (
        <Comp>
          {() => (
            <div>
              <div data-testid="count">{count}</div>
              <button onClick={() => setCount((c) => c + 1)}>+</button>
            </div>
          )}
        </Comp>
      );
    };

    const { getByTestId, getByText } = render(<App />);

    expect(getByTestId("count").innerText).toBe("0");

    act(() => {
      getByText("+").click();
    });

    expect(getByTestId("count").innerText).toBe("1");
  });
});

describe("<Comp /> used conditionally", () => {
  test("with hooks inside", () => {
    const App = () => {
      const [show, setShow] = React.useState(false);
      return (
        <div>
          <button onClick={() => setShow((s) => !s)}>toggle</button>
          {show && (
            <Comp>
              {() => {
                const [count] = React.useState(0);
                return (
                  <div>
                    <div data-testid="foo">foo</div>
                    <div data-testid="count">{count}</div>
                  </div>
                );
              }}
            </Comp>
          )}
        </div>
      );
    };

    const { getByTestId, getByText, queryByTestId } = render(<App />);

    expect(queryByTestId("foo")).toBeNull();

    act(() => {
      getByText("toggle").click();
    });

    expect(getByTestId("foo").innerText).toBe("foo");

    act(() => {
      getByText("toggle").click();
    });

    expect(queryByTestId("foo")).toBeNull();
  });

  test("renders more hooks than its counterpart in a ternary expression", () => {
    const App = () => {
      const [show, setShow] = React.useState(false);
      return (
        <div>
          <button onClick={() => setShow((s) => !s)}>toggle</button>
          {show ? (
            <Comp key="a">
              {() => {
                React.useEffect(() => {});
                const [count] = React.useState(0);
                return (
                  <div>
                    <div data-testid="foo">foo</div>
                    <div data-testid="count">{count}</div>
                  </div>
                );
              }}
            </Comp>
          ) : (
            <Comp key="b">
              {() => {
                const [count] = React.useState(0);
                return (
                  <div>
                    <div data-testid="foo">foo</div>
                    <div data-testid="count">{count}</div>
                  </div>
                );
              }}
            </Comp>
          )}
        </div>
      );
    };

    const { getByTestId, getByText } = render(<App />);

    expect(getByTestId("foo").innerText).toBe("foo");

    act(() => {
      getByText("toggle").click();
    });

    expect(getByTestId("foo").innerText).toBe("foo");

    act(() => {
      getByText("toggle").click();
    });

    expect(getByTestId("foo").innerText).toBe("foo");
  });
});

describe("Possible to optimize for rerenders", () => {
  test("with useMemo", () => {
    let renderCount = 0;
    const App = () => {
      const [count, setCount] = React.useState(0);
      return (
        <div>
          <div data-testid="count">{count}</div>
          <button onClick={() => setCount((c) => c + 1)}>+</button>
          {React.useMemo(
            () => (
              <Comp>
                {() => {
                  React.useEffect(() => {});
                  renderCount++;
                  return <div>foo</div>;
                }}
              </Comp>
            ),
            []
          )}
        </div>
      );
    };

    const { getByTestId, getByText } = render(<App />);

    expect(getByTestId("count").innerText).toBe("0");
    expect(renderCount).toBe(1);

    act(() => {
      getByText("+").click();
    });

    expect(getByTestId("count").innerText).toBe("1");
    expect(renderCount).toBe(1);
  });

  test("with useCallback and memo", () => {
    let renderCount = 0;
    const App = () => {
      const [count, setCount] = React.useState(0);
      return (
        <div>
          <div data-testid="count">{count}</div>
          <button onClick={() => setCount((c) => c + 1)}>+</button>
          <MComp>
            {React.useCallback(() => {
              React.useEffect(() => {});
              renderCount++;
              return <div>foo</div>;
            }, [])}
          </MComp>
        </div>
      );
    };

    const { getByTestId, getByText } = render(<App />);

    expect(getByTestId("count").innerText).toBe("0");
    expect(renderCount).toBe(1);

    act(() => {
      getByText("+").click();
    });

    expect(getByTestId("count").innerText).toBe("1");
    expect(renderCount).toBe(1);
  });

  test("adding another layer in case of useMemo being called conditionally ", () => {
    let renderCount = 0;
    const App = () => {
      const [count, setCount] = React.useState(0);
      return (
        <div>
          <div data-testid="count">{count}</div>
          <button onClick={() => setCount((c) => c + 1)}>+</button>
          <Comp>
            {() =>
              React.useMemo(
                () => (
                  <Comp>
                    {() => {
                      React.useEffect(() => {});
                      renderCount++;
                      return <div>foo</div>;
                    }}
                  </Comp>
                ),
                []
              )
            }
          </Comp>
        </div>
      );
    };

    const { getByTestId, getByText } = render(<App />);

    expect(getByTestId("count").innerText).toBe("0");
    expect(renderCount).toBe(1);

    act(() => {
      getByText("+").click();
    });

    expect(getByTestId("count").innerText).toBe("1");
    expect(renderCount).toBe(1);
  });
});
