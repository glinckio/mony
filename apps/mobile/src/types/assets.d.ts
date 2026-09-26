// Metro resolves font files to a numeric asset id.
declare module "*.ttf" {
  const asset: number;
  export default asset;
}
