import time
from app.llm import get_llm_provider

p = get_llm_provider()
start = time.time()
print(p.generate("Say hello as a student in one sentence."))
print(f"\nTook {time.time() - start:.1f} seconds")