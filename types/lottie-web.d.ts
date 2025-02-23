declare module "lottie-web" {
  interface AnimationConfig {
    container: HTMLElement;
    renderer: "svg" | "canvas" | "html";
    loop?: boolean;
    autoplay?: boolean;
    path?: string;
    animationData?: any;
  }

  interface AnimationItem {
    destroy: () => void;
  }

  interface LottiePlayer {
    loadAnimation: (config: AnimationConfig) => AnimationItem;
  }

  const lottie: LottiePlayer;
  export default lottie;
}
