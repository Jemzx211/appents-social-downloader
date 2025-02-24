import { mergeJsonObjects } from "../utils/utils";

describe("compareJsonObjects", () => {
  test("should return an empty object for an empty array", () => {
    expect(mergeJsonObjects([])).toEqual({});
  });

  test("should return the same object if only one object is provided", () => {
    const input = [{ name: "alice", age: 25 }];
    expect(mergeJsonObjects(input)).toEqual(input[0]);
  });

  test("should merge objects with unique keys", () => {
    const input = [
      { name: "alice", age: 25 },
      { city: "NYC", country: "USA" },
    ];
    const expected = { name: "alice", age: 25, city: "NYC", country: "USA" };
    expect(mergeJsonObjects(input)).toEqual(expected);
  });

  test("should handle conflicting values by appending index", () => {
    const input = [
      { name: "alice", age: 25 },
      { name: "bob", age: 25 },
    ];
    const expected = { name: "alice", age: 25, "name.1": "bob" };
    expect(mergeJsonObjects(input)).toEqual(expected);
  });

  test("should handle multiple conflicting values", () => {
    const input = [
      { name: "alice", age: 25 },
      { name: "bob", age: 30 },
      { name: "charlie", age: 35 },
    ];
    const expected = {
      name: "alice",
      age: 25,
      "name.1": "bob",
      "age.1": 30,
      "name.2": "charlie",
      "age.2": 35,
    };
    expect(mergeJsonObjects(input)).toEqual(expected);
  });

  test("should correctly handle mixed unique and conflicting keys", () => {
    const input = [
      { name: "alice", age: 25, city: "NYC" },
      { name: "bob", age: 25, country: "USA" },
      { name: "alice", age: 30, city: "LA" },
    ];
    const expected = {
      name: "alice",
      age: 25,
      city: "NYC",
      country: "USA",
      "name.1": "bob",
      "age.1": 30,
      "city.1": "LA",
    };
    expect(mergeJsonObjects(input)).toEqual(expected);
  });
});
