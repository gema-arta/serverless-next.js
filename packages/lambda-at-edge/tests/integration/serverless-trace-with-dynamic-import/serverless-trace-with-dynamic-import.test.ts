import { remove, readdir, pathExists } from "fs-extra";
import path from "path";
import os from "os";
import Builder from "../../../src/build";
import { getNextBinary } from "../../test-utils";

jest.unmock("execa");

describe("Serverless Trace With Dynamic Import", () => {
  const nextBinary = getNextBinary();
  const fixtureDir = path.join(__dirname, "./fixture");
  let outputDir: string;

  beforeAll(async () => {
    outputDir = os.tmpdir();
    console.log("OUTPUT DIR: ", outputDir);
    const builder = new Builder(fixtureDir, outputDir, {
      cwd: fixtureDir,
      cmd: nextBinary,
      args: ["build"],
      useServerlessTraceTarget: true
    });

    await builder.build();
    console.log(await readdir(outputDir));
  });

  afterAll(() => {
    return Promise.all(
      [".next"].map(file => remove(path.join(fixtureDir, file)))
    );
  });

  it("copies node_modules to default lambda artefact", async () => {
    console.log(await readdir(outputDir));
    console.log(await readdir(path.join(outputDir, "default-lambda")));
    const nodeModules = await readdir(
      path.join(outputDir, "default-lambda/node_modules")
    );
    expect(nodeModules.length).toBeGreaterThan(5); // 5 is just an arbitrary number to ensure dependencies are being copied
  });

  it("copies node_modules to api lambda artefact", async () => {
    console.log(await readdir(path.join(outputDir, "api-lambda")));
    const nodeModules = await readdir(
      path.join(outputDir, "api-lambda/node_modules")
    );
    expect(nodeModules).toEqual(["next", "next-aws-cloudfront"]);
  });

  it("copies dynamic chunk to default lambda artefact", async () => {
    const chunkFileName = (
      await readdir(path.join(fixtureDir, ".next/serverless"))
    ).find(file => {
      return /^[\d]+\.+[\w,\s-]+\.(js)$/.test(file);
    });

    expect(chunkFileName).toBeDefined();

    const chunkExistsInOutputBuild = await pathExists(
      path.join(outputDir, "default-lambda", chunkFileName as string)
    );
    expect(chunkExistsInOutputBuild).toBe(true);
  });
});
