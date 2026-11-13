/* EXTRACTEUR DE DISCUSSION LLM (avec SCROLL AUTO) -> .txt
   F12 > Console > coller > Entree (tape 'allow pasting' si demande).
   Ou bookmarklet (voir bookmarklet.txt).
   Support: ChatGPT, Claude, Gemini, Perplexity, DeepSeek, Arena + generique (Grok, Qwen...).
   Le script remonte tout en haut puis redescend automatiquement pour charger
   TOUS les messages (listes virtualisees type DeepSeek), puis telecharge le .txt.
   Nom du fichier = nom de domaine + sujet (Arena = debut du 1er message). */

(function(){
  function siteName(){
    var p=location.hostname.replace(/^www\./,"").split(".");
    var skip={chat:1,app:1,beta:1,api:1,www:1,web:1,console:1,platform:1};
    while(p.length>1&&skip[p[0]])p.shift();
    return p[0]||"chat";
  }
  function siteKey(){
    var h=location.hostname;
    if(h.includes("openai")||h.includes("chatgpt"))return "chatgpt";
    if(h.includes("claude")||h.includes("anthropic"))return "claude";
    if(h.includes("gemini")||h.includes("bard"))return "gemini";
    if(h.includes("perplexity"))return "perplexity";
    if(h.includes("deepseek"))return "deepseek";
    if(h.includes("arena"))return "arena";
    return "generic";
  }
  function roleOf(el){
    var s=((el.getAttribute("data-message-author-role")||"")+" "+(el.getAttribute("data-testid")||"")+" "+(el.getAttribute("data-role")||"")+" "+(el.getAttribute("data-conversation-role")||"")+" "+(el.getAttribute("aria-label")||"")+" "+(el.className||"")).toLowerCase();
    if(/\buser\b|\bhuman\b|user-message|human-message/.test(s))return "user";
    if(/assistant|\bmodel\b|response|\bbot\b|message-bubble--ai/.test(s))return "assistant";
    return null;
  }
  function specific(key){
    var out=[];
    if(key==="chatgpt"){
      var seen=[];
      function nearest(el,sel){ return el&&el.closest?el.closest(sel):null; }
      function push(role,node,extra){
        if(!node||seen.indexOf(node)>-1)return;
        seen.push(node);
        out.push({role:role,node:node,extra:extra||[]});
      }
      /* pieces jointes (cartes de fichiers) regroupees par tour */
      var cards={};
      document.querySelectorAll(".group\\/resource-card").forEach(function(card){
        if(nearest(card,"[data-response-body]"))return;
        var turn=nearest(card,"[data-turn-key], [data-content-search-turn-key]")||card.parentElement;
        if(!turn)return;
        var c=card.cloneNode(true);
        c.querySelectorAll("button,svg").forEach(function(x){x.remove();});
        var t=(c.textContent||"").replace(/\s+/g," ").trim();
        if(!t)return;
        var k=turn.getAttribute("data-turn-key")||turn.getAttribute("data-content-search-turn-key")||"";
        (cards[k]=cards[k]||[]).push(t);
      });
      function cardsOf(el){
        var turn=nearest(el,"[data-turn-key], [data-content-search-turn-key]");
        var k=turn?(turn.getAttribute("data-turn-key")||turn.getAttribute("data-content-search-turn-key")||""):"";
        return cards[k]||[];
      }
      /* interface actuelle : une "unite" par message */
      var firstBubble={};
      document.querySelectorAll("[data-chatgpt-search-unit-key], [data-content-search-unit-key]").forEach(function(unit){
        var bubble=unit.querySelector("[data-user-message-bubble]");
        if(bubble){
          var turn=nearest(unit,"[data-turn-key], [data-content-search-turn-key]")||unit;
          var k=turn.getAttribute("data-turn-key")||turn.getAttribute("data-content-search-turn-key")||"";
          var extra=[];
          if(!firstBubble[k]){firstBubble[k]=1;extra=cardsOf(unit);}
          return push("user",bubble,extra);
        }
        var body=unit.querySelector("[data-response-body]");
        if(body){
          if(nearest(body.parentElement,"[data-response-body]"))return;
          return push("assistant",body);
        }
        var key2=unit.getAttribute("data-chatgpt-search-unit-key")||unit.getAttribute("data-content-search-unit-key")||"";
        var hint=(key2.split(":").pop()||"").toLowerCase();
        if(hint==="user"||hint==="assistant")push(hint,unit);
      });
      /* interface precedente : en-tete de role + contenu frere */
      document.querySelectorAll("[data-conversation-role]").forEach(function(h){
        var role=(h.getAttribute("data-conversation-role")||"").toLowerCase();
        if(role!=="user"&&role!=="assistant")return;
        var node=null;
        if(role==="user"){
          node=h.parentElement&&h.parentElement.querySelector("[data-user-message-bubble]");
          if(!node)node=h.parentElement&&h.parentElement.querySelector(".whitespace-pre-wrap");
        }else{
          node=h.parentElement&&h.parentElement.querySelector("[data-response-body]");
        }
        if(role==="user"&&node)return push("user",node,cardsOf(h));
        push(role,node);
      });
      /* ancienne interface */
      document.querySelectorAll('[data-message-author-role]').forEach(function(el){
        push((el.getAttribute("data-message-author-role")||"").toLowerCase(),el);
      });
      out.sort(function(a,b){
        if(a.node===b.node)return 0;
        return a.node.compareDocumentPosition(b.node)&4?-1:1;
      });
    } else if(key==="claude"){
      document.querySelectorAll('[data-testid="user-message"], .font-claude-response, .font-claude-message').forEach(function(el){
        var isUser=el.getAttribute("data-testid")==="user-message"||!!el.closest('[data-testid="user-message"]');
        out.push({role:isUser?"user":"assistant",node:el});
      });
    } else if(key==="gemini"){
      document.querySelectorAll("user-query, model-response").forEach(function(el){
        out.push({role:el.tagName.toLowerCase()==="user-query"?"user":"assistant",node:el});
      });
    } else if(key==="perplexity"){
      document.querySelectorAll('[class*="group/query"], .prose').forEach(function(el){
        if(el.closest("textarea")||el.closest("form"))return;
        var isUser=(el.getAttribute("class")||"").indexOf("group/query")>-1;
        out.push({role:isUser?"user":"assistant",node:el});
      });
    } else if(key==="deepseek"){
      document.querySelectorAll(".ds-message").forEach(function(m){
        var md=null;
        m.querySelectorAll(".ds-markdown").forEach(function(x){if(!x.closest(".ds-think-content"))md=x;});
        if(md){out.push({role:"assistant",node:md});}
        else{out.push({role:"user",node:m});}
      });
    } else if(key==="arena"){
      document.querySelectorAll(".prose").forEach(function(el){
        if(el.closest(".font-mono"))return;
        if(el.closest(".tiptap")||el.closest(".ProseMirror")||el.closest("form"))return;
        var isUser=!!el.closest(".bg-surface-raised")||!!el.closest(".items-end");
        out.push({role:isUser?"user":"assistant",node:el});
      });
    }
    return out;
  }
  function generic(){
    var sel='[data-message-author-role],[data-conversation-role],[data-testid*="message"],[data-role],[class*="message-bubble"],[class*="claude-response"],[class*="claude-message"],[class*="chat-turn"],[class*="conversation-turn"],[class*="-message"],[class*="message-"]';
    var raw=[];
    document.querySelectorAll(sel).forEach(function(n){raw.push(n);});
    function textOf(n){return ((n.innerText||n.textContent||"")+"").trim();}
    var nodes=raw.filter(function(n){
      if(textOf(n).length<1)return false;
      // les en-tetes de role ("Vous avez dit :") ne sont pas des messages
      if(n.getAttribute("data-conversation-role")!==null)return false;
      if((n.getAttribute("role")||"")==="separator")return false;
      for(var i=0;i<raw.length;i++){
        if(raw[i]!==n&&textOf(raw[i]).length>0&&n.contains&&n.contains(raw[i]))return false;
      }
      return true;
    });
    var out=[],expect="user";
    nodes.forEach(function(n){
      var r=roleOf(n)||expect;
      expect=(r==="user")?"assistant":"user";
      out.push({role:r,node:n});
    });
    return out;
  }
  function getBlocks(key){
    var b=specific(key);
    if(b.filter(function(x){return (x.node.innerText||x.node.textContent||"").trim();}).length<2){
      b=generic();
    }
    return b;
  }
  var LABELS=[/^vous avez dit\s*:?\.?$/i,/^you said\s*:?\.?$/i,/^(gemini|chatgpt|claude|grok|qwen|mistral|le chat|copilot|deepseek) (a dit|said)\s*:?\.?$/i];
  function clean(node,extra){
    var c=node.cloneNode(true);
    if(c.querySelectorAll)c.querySelectorAll("button, svg, style, script").forEach(function(b){b.remove();});
    var t=c.innerText||c.textContent||"";
    t=t.replace(/\u00a0/g," ");
    var lines=t.split("\n").filter(function(line){
      var L=line.trim();
      for(var i=0;i<LABELS.length;i++){if(LABELS[i].test(L))return false;}
      return true;
    });
    var body=lines.join("\n").replace(/\n{3,}/g,"\n\n").trim();
    var pre=(extra||[]).filter(function(e){return (e||"").trim();});
    return pre.length?pre.join("\n")+"\n"+body:body;
  }
  function captureKeyed(key){
    var out=[];
    getBlocks(key).forEach(function(b){
      var content=clean(b.node,b.extra);
      if(!content)return;
      out.push({role:b.role,content:content,k:b.role+"\u0001"+content});
    });
    return out;
  }
  function merge(acc,cur){
    if(acc.length===0)return cur.slice();
    if(cur.length===0)return acc;
    var maxK=Math.min(acc.length,cur.length);
    for(var k=maxK;k>=1;k--){
      var ok=true;
      for(var i=0;i<k;i++){ if(acc[acc.length-k+i].k!==cur[i].k){ok=false;break;} }
      if(ok)return acc.concat(cur.slice(k));
    }
    return acc.concat(cur);
  }
  function slug(s){
    return (s||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,40)||"discussion";
  }
  function getScroller(sample){
    var n=sample;
    while(n&&n!==document.body&&n!==document.documentElement){
      try{
        var st=getComputedStyle(n);
        if(/(auto|scroll)/.test(st.overflowY)&&n.scrollHeight>n.clientHeight+40)return n;
      }catch(e){}
      n=n.parentElement;
    }
    return document.scrollingElement||document.documentElement;
  }
  function sleep(ms){return new Promise(function(r){setTimeout(r,ms);});}
  function statusBox(){
    var d=document.createElement("div");
    d.style.cssText="position:fixed;z-index:2147483647;right:16px;bottom:16px;background:#4f46e5;color:#fff;font:600 13px system-ui,sans-serif;padding:10px 14px;border-radius:10px;box-shadow:0 6px 20px rgba(0,0,0,.3);max-width:280px";
    document.body.appendChild(d);
    return d;
  }

  (async function(){
    var key=siteKey();
    var box=statusBox();
    box.textContent="⏳ Préparation...";
    var first=captureKeyed(key);
    if(first.length===0){box.textContent="❌ Aucun message détecté sur cette page.";await sleep(2500);box.remove();return;}
    var scroller=getScroller(getBlocks(key)[0]&&getBlocks(key)[0].node||document.body);
    var prevScroll=scroller.scrollTop;
    box.textContent="⏳ Remontée en haut...";
    for(var i=0;i<40;i++){ scroller.scrollTop=0; await sleep(120); if(scroller.scrollTop===0)break; }
    await sleep(300);
    var acc=[];
    var step=Math.max(250,(scroller.clientHeight||600)*0.7);
    var prevTop=-1,same=0,start=Date.now();
    while(true){
      acc=merge(acc,captureKeyed(key));
      box.textContent="⏳ Lecture... "+acc.length+" messages";
      var atBottom=scroller.scrollTop+scroller.clientHeight>=scroller.scrollHeight-5;
      if(atBottom){ await sleep(300); acc=merge(acc,captureKeyed(key)); break; }
      scroller.scrollTop=scroller.scrollTop+step;
      await sleep(300);
      if(scroller.scrollTop===prevTop){ same++; if(same>=3)break; } else same=0;
      prevTop=scroller.scrollTop;
      if(Date.now()-start>90000)break;
    }
    try{scroller.scrollTop=prevScroll;}catch(e){}

    var cleaned=[];
    acc.forEach(function(b){
      var last=cleaned[cleaned.length-1];
      if(last&&last.role===b.role&&last.content===b.content)return;
      cleaned.push({role:b.role,content:b.content});
    });
    if(cleaned.length===0){box.textContent="❌ Discussion vide.";await sleep(2500);box.remove();return;}
    var name=siteName();
    var txt="Discussion extraite de : "+location.href+"\n"+"Site : "+name+"\n"+"Date d'extraction : "+new Date().toLocaleString()+"\n"+"Nombre de messages : "+cleaned.length+"\n"+"============================================================\n\n";
    cleaned.forEach(function(b){
      var label=b.role==="user"?"MOI":"ASSISTANT";
      txt+="===== "+label+" =====\n"+b.content+"\n\n";
    });
    var subject="";
    if(key!=="arena"){
      subject=(document.title||"").replace(/\s*[-|\u2013]\s*(ChatGPT|Claude|Gemini|Grok|Qwen|Mistral|Le Chat|Perplexity|Copilot|DeepSeek|Arena).*$/i,"").trim();
    }
    if(!subject||subject.length<3){
      var fu=cleaned.find(function(b){return b.role==="user";});
      subject=fu?fu.content:cleaned[0].content;
    }
    var blob=new Blob([txt],{type:"text/plain;charset=utf-8"});
    var url=URL.createObjectURL(blob);
    var a=document.createElement("a");
    a.href=url;a.download=name+"_"+slug(subject)+".txt";
    document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);
    box.textContent="✅ "+cleaned.length+" messages exportés !";
    console.log("OK : "+cleaned.length+" messages exportes -> "+a.download);
    await sleep(2500);box.remove();
  })();
})();
