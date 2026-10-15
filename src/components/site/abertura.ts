/**
 * A abertura da `/conheca` (`DECISOES.md#d383`): uma vez por sessão, nunca com
 * movimento reduzido. Fora do módulo da `FaixaDoCusto` porque a página, que é
 * de servidor, precisa do texto do script, e de um módulo `"use client"` ela
 * só recebe referência.
 */
export const CHAVE_DA_ABERTURA = "rende-abertura-vista";

/**
 * Roda antes da primeira pintura, como o `SCRIPT_TEMA`: com `data-abertura` no
 * `<html>` a abertura cobre a página desde o começo; sem ele, nem aparece. A
 * mesma condição que a `FaixaDoCusto` confere ao montar.
 */
export const SCRIPT_DA_ABERTURA = `try{if(!matchMedia("(prefers-reduced-motion: reduce)").matches&&!sessionStorage.getItem("${CHAVE_DA_ABERTURA}"))document.documentElement.dataset.abertura=""}catch(e){}`;
