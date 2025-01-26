import PageLayout from "./page-layout";

export default function ComingSoon() {
  return (
    <pre style={{ textAlign: "center", fontFamily: "Courier, monospace" }}>
      {String.raw`
      ___         ___           ___           ___           ___     
     /\  \       /\__\         /\__\         /\  \         /\__\    
    /::\  \     /:/ _/_       /:/ _/_       /::\  \       /:/ _/_   
   /:/\:\__\   /:/ /\__\     /:/ /\  \     /:/\:\  \     /:/ /\  \  
  /:/ /:/  /  /:/ /:/ _/_   /:/ /::\  \   /:/  \:\  \   /:/ /::\  \ 
 /:/_/:/  /  /:/_/:/ /\__\ /:/_/:/\:\__\ /:/__/ \:\__\ /:/_/:/\:\__\
 \:\/:/  /   \:\/:/ /:/  / \:\/:/ /:/  / \:\  \ /:/  / \:\/:/ /:/  /
  \::/__/     \::/_/:/  /   \::/ /:/  /   \:\  /:/  /   \::/ /:/  / 
   \:\  \      \:\/:/  /     \/_/:/  /     \:\/:/  /     \/_/:/  /  
    \:\__\      \::/  /        /:/  /       \::/  /        /:/  /   
     \/__/       \/__/         \/__/         \/__/         \/__/    
      
*Publish Elsewhere, Syndicate On (Your Own) Site
  
    A simple way to back up your RSS feeds so you control your own content.     
      `}
    </pre>
  );
}
